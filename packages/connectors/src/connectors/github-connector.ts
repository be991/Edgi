import { safeFetch } from '@edgi/security';
import {
  DiscoveryInput,
  DiscoveryResult,
  DiscoveredItem,
  SourceCapabilities,
  SourceConnector,
  SourceContent,
  SourceHealth,
  ValidationResult,
} from '../types';

export class GitHubConnector implements SourceConnector {
  readonly provider = 'github';

  async validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { isValid: false, errors: ['GitHub URL is required.'] };
    }
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== 'github.com' && parsed.hostname !== 'api.github.com') {
        return { isValid: false, errors: ['URL must be on github.com or api.github.com'] };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, errors: [`Invalid GitHub URL: ${url}`] };
    }
  }

  async getCapabilities(): Promise<SourceCapabilities> {
    const hasToken = !!process.env.GITHUB_TOKEN;
    return {
      canSearch: true,
      canPaginate: true,
      rateLimitPerMin: hasToken ? 80 : 10,
      requiresAuth: false,
      isRealTime: false,
      notes: `Official GitHub REST API (v3). Auth: ${hasToken ? 'Authenticated (5000 req/hr)' : 'Unauthenticated (60 req/hr)'}.`,
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const { org, repo } = this.parseGitHubUrl(input.url);
    const token = (input.config?.token as string) || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'EdgiOpportunityBot/1.0 (+https://github.com/be991/edgi)',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const items: DiscoveredItem[] = [];

    // Case 1: Specific repository -> query releases
    if (org && repo) {
      const releasesApiUrl = `https://api.github.com/repos/${org}/${repo}/releases?per_page=10`;
      try {
        const res = await safeFetch(releasesApiUrl, { headers, timeoutMs: 10000 });
        if (res.statusCode === 200) {
          const releases = res.json<Array<Record<string, unknown>>>();
          for (const rel of releases) {
            const htmlUrl = rel.html_url as string;
            const name = (rel.name || rel.tag_name || 'Release') as string;
            const body = (rel.body || '') as string;
            const publishedAt = rel.published_at ? new Date(rel.published_at as string) : undefined;

            items.push({
              url: htmlUrl,
              title: `${org}/${repo}: ${name}`,
              rawBody: body || `Release ${name} published for repository ${org}/${repo}`,
              publishedAt,
              author: (rel.author as Record<string, unknown>)?.login as string,
              metadata: {
                releaseId: rel.id,
                tag: rel.tag_name,
              },
            });
          }
        }
      } catch {
        // Fallback to repo overview if releases not available
      }
    }

    // Case 2: Organization -> query active public repos
    if (org && !repo) {
      const orgReposApiUrl = `https://api.github.com/orgs/${org}/repos?sort=updated&per_page=15`;
      try {
        const res = await safeFetch(orgReposApiUrl, { headers, timeoutMs: 10000 });
        if (res.statusCode === 200) {
          const repos = res.json<Array<Record<string, unknown>>>();
          for (const r of repos) {
            const htmlUrl = r.html_url as string;
            const name = r.name as string;
            const description = (r.description || '') as string;
            const updatedAt = r.updated_at ? new Date(r.updated_at as string) : undefined;

            items.push({
              url: htmlUrl,
              title: `${org}/${name}`,
              rawBody: description || `Public repository ${org}/${name}`,
              publishedAt: updatedAt,
              metadata: {
                stars: r.stargazers_count,
                topics: r.topics,
                hasDiscussions: r.has_discussions,
              },
            });
          }
        }
      } catch (err) {
        // Safe catch
      }
    }

    const finalItems = input.limit ? items.slice(0, input.limit) : items;

    return {
      items: finalItems,
      hasMore: false,
    };
  }

  async fetchContent(reference: string): Promise<SourceContent> {
    const res = await safeFetch(reference, { method: 'GET', timeoutMs: 10000 });
    return {
      url: reference,
      title: 'GitHub Content',
      rawBody: res.body,
    };
  }

  async checkHealth(config: Record<string, unknown>): Promise<SourceHealth> {
    const url = config.url as string;
    const { org, repo } = this.parseGitHubUrl(url);
    const start = Date.now();

    const apiUrl = repo
      ? `https://api.github.com/repos/${org}/${repo}`
      : `https://api.github.com/orgs/${org}`;

    const token = (config.token as string) || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'EdgiOpportunityBot/1.0 (+https://github.com/be991/edgi)',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    try {
      const res = await safeFetch(apiUrl, { headers, timeoutMs: 8000 });
      const latencyMs = Date.now() - start;

      if (res.statusCode === 200) {
        return {
          isHealthy: true,
          statusCode: 200,
          responseTimeMs: latencyMs,
        };
      }

      if (res.statusCode === 403) {
        const remaining = res.headers['x-ratelimit-remaining'];
        return {
          isHealthy: false,
          statusCode: 403,
          responseTimeMs: latencyMs,
          errorMessage: `GitHub API rate limit reached (Remaining: ${remaining}). Consider adding a GITHUB_TOKEN.`,
        };
      }

      return {
        isHealthy: false,
        statusCode: res.statusCode,
        responseTimeMs: latencyMs,
        errorMessage: `GitHub API error ${res.statusCode}: ${res.statusText}`,
      };
    } catch (err: unknown) {
      return {
        isHealthy: false,
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private parseGitHubUrl(urlStr: string): { org: string; repo?: string } {
    try {
      const parsed = new URL(urlStr);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        return { org: segments[0]!, repo: segments[1]! };
      }
      if (segments.length === 1) {
        return { org: segments[0]! };
      }
    } catch {}
    return { org: '' };
  }
}

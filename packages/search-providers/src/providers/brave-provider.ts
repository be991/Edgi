import { safeFetch } from '@edgi/security';
import { SearchInput, SearchProvider, SearchResult, ProviderHealth, ProviderUsage } from '../types';

export class BraveSearchProvider implements SearchProvider {
  readonly name = 'brave_search';
  // Brave Search API standard tier is ~$3 per 1,000 queries = $0.003/query (Free tier offers 2,000 queries/mo free)
  readonly costPerCallUsd = 0.003;

  private apiKey: string | undefined;
  private requestsToday = 0;
  private totalCost = 0.0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_SEARCH_API_KEY;
  }

  async search(input: SearchInput): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key not configured. Provide BRAVE_SEARCH_API_KEY in environment.');
    }

    const endpoint = new URL('https://api.search.brave.com/res/v1/web/search');
    endpoint.searchParams.set('q', input.query);
    endpoint.searchParams.set('count', String(input.limit || 10));

    if (input.country) {
      endpoint.searchParams.set('country', input.country);
    }
    if (input.timeWindow) {
      endpoint.searchParams.set('freshness', input.timeWindow === 'year' ? 'py' : input.timeWindow === 'month' ? 'pm' : 'pw');
    }

    const response = await safeFetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
      timeoutMs: 10000,
      allowedContentTypes: ['application/json'],
    });

    if (response.statusCode === 429) {
      throw new Error('Brave Search rate limit exceeded.');
    }

    if (response.statusCode >= 400) {
      throw new Error(`Brave Search error: HTTP ${response.statusCode}: ${response.statusText}`);
    }

    this.requestsToday += 1;
    this.totalCost += this.costPerCallUsd;

    const data = response.json<{ web?: { results?: Array<Record<string, unknown>> } }>();
    const results: SearchResult[] = [];

    if (data?.web?.results) {
      for (const item of data.web.results) {
        const url = (item.url as string) || '';
        const title = (item.title as string) || '';
        const snippet = (item.description as string) || '';

        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {}

        if (url && domain) {
          results.push({
            url,
            title,
            snippet,
            domain,
            publishedDate: item.page_age as string | undefined,
          });
        }
      }
    }

    return results;
  }

  async getUsage(): Promise<ProviderUsage> {
    return {
      requestsToday: this.requestsToday,
      requestsThisMonth: this.requestsToday,
      totalCostUsd: Number(this.totalCost.toFixed(4)),
    };
  }

  async checkAvailability(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        isAvailable: false,
        errorMessage: 'Brave Search API key is not configured in .env.local',
      };
    }

    const start = Date.now();
    try {
      const res = await safeFetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.apiKey,
        },
        timeoutMs: 6000,
        allowedContentTypes: ['application/json'],
      });

      return {
        isAvailable: res.statusCode === 200,
        latencyMs: Date.now() - start,
        errorMessage: res.statusCode !== 200 ? `HTTP ${res.statusCode}: ${res.statusText}` : undefined,
      };
    } catch (err: unknown) {
      return {
        isAvailable: false,
        latencyMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

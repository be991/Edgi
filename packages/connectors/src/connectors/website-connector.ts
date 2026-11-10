import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
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

export class WebsiteConnector implements SourceConnector {
  readonly provider = 'website';

  async validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { isValid: false, errors: ['Website URL is required.'] };
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { isValid: false, errors: ['URL must use http or https protocol.'] };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, errors: [`Invalid website URL: ${url}`] };
    }
  }

  async getCapabilities(): Promise<SourceCapabilities> {
    return {
      canSearch: false,
      canPaginate: true,
      rateLimitPerMin: 20,
      requiresAuth: false,
      isRealTime: false,
      notes: 'Focused Cheerio/HTML crawler with conservative rate limiting, robots.txt compliance, and SHA-256 content change detection.',
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const targetUrl = new URL(input.url);

    // Fetch the primary page
    const pageResponse = await safeFetch(input.url, {
      method: 'GET',
      timeoutMs: 12000,
      allowedContentTypes: ['text/html', 'application/xhtml+xml', 'text/plain'],
    });

    const $ = cheerio.load(pageResponse.body);

    // Remove noise elements
    $('script, style, noscript, iframe, svg, nav, footer').remove();

    const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';
    const mainText = $('main, article, [role="main"]').text().replace(/\s+/g, ' ').trim() || $('body').text().replace(/\s+/g, ' ').trim();

    // Primary item represents the main target page
    const items: DiscoveredItem[] = [
      {
        url: input.url,
        title: pageTitle,
        rawBody: mainText,
        publishedAt: new Date(),
        metadata: {
          contentHash: crypto.createHash('sha256').update(mainText).digest('hex'),
        },
      },
    ];

    // Find same-origin opportunity links on the page (careers, apply, grant, fellowship, hackathon)
    const opportunityLinkRegex = /\b(career|job|opportunity|fellowship|grant|apply|internship|hackathon|bounty|programme|challenge)\b/i;
    const discoveredLinks = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (!href) return;

      try {
        const resolved = new URL(href, input.url);
        // Enforce same hostname restriction
        if (resolved.hostname === targetUrl.hostname && !discoveredLinks.has(resolved.href)) {
          if (opportunityLinkRegex.test(resolved.pathname) || opportunityLinkRegex.test(text)) {
            discoveredLinks.add(resolved.href);
            items.push({
              url: resolved.href,
              title: text || resolved.pathname,
              rawBody: `Discovered opportunity link from ${input.url}: ${text} (${resolved.href})`,
              publishedAt: new Date(),
              metadata: {
                parentUrl: input.url,
              },
            });
          }
        }
      } catch {
        // Ignore unparseable hrefs
      }
    });

    const finalItems = input.limit ? items.slice(0, input.limit) : items;

    return {
      items: finalItems,
      hasMore: false,
    };
  }

  async fetchContent(reference: string): Promise<SourceContent> {
    const res = await safeFetch(reference, { method: 'GET', timeoutMs: 10000 });
    const $ = cheerio.load(res.body);
    $('script, style, noscript, iframe, svg').remove();
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Website Opportunity';
    const bodyText = $('main, article, body').text().replace(/\s+/g, ' ').trim();

    return {
      url: reference,
      title,
      rawBody: bodyText,
    };
  }

  async checkHealth(config: Record<string, unknown>): Promise<SourceHealth> {
    const url = config.url as string;
    const start = Date.now();
    try {
      const res = await safeFetch(url, { method: 'GET', timeoutMs: 8000 });
      const latencyMs = Date.now() - start;

      if (res.statusCode >= 200 && res.statusCode < 400) {
        return {
          isHealthy: true,
          statusCode: res.statusCode,
          responseTimeMs: latencyMs,
        };
      }

      return {
        isHealthy: false,
        statusCode: res.statusCode,
        responseTimeMs: latencyMs,
        errorMessage: `Website returned HTTP status ${res.statusCode}: ${res.statusText}`,
      };
    } catch (err: unknown) {
      return {
        isHealthy: false,
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

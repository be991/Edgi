import { safeFetch } from '@edgi/security';
import { SearchInput, SearchProvider, SearchResult, ProviderHealth, ProviderUsage } from '../types';

export class SerperSearchProvider implements SearchProvider {
  readonly name = 'serper';
  // Serper is $0.001 per query ($1 per 1,000 queries)
  readonly costPerCallUsd = 0.001;

  private apiKey: string | undefined;
  private requestsToday = 0;
  private totalCost = 0.0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPER_API_KEY;
  }

  async search(input: SearchInput): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Serper API key not configured. Provide SERPER_API_KEY in environment.');
    }

    const payload = {
      q: input.query,
      num: input.limit || 10,
      gl: input.country ? input.country.toLowerCase() : 'ng',
    };

    const response = await safeFetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify(payload),
      timeoutMs: 10000,
      allowedContentTypes: ['application/json'],
    });

    if (response.statusCode === 429) {
      throw new Error('Serper rate limit exceeded.');
    }

    if (response.statusCode >= 400) {
      throw new Error(`Serper error: HTTP ${response.statusCode}: ${response.statusText}`);
    }

    this.requestsToday += 1;
    this.totalCost += this.costPerCallUsd;

    const data = response.json<{ organic?: Array<{ title?: string; link?: string; snippet?: string; date?: string }> }>();
    const results: SearchResult[] = [];

    if (data?.organic) {
      for (const item of data.organic) {
        const url = item.link || '';
        const title = item.title || '';
        const snippet = item.snippet || '';

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
            publishedDate: item.date,
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
        errorMessage: 'Serper API key is not configured in .env.local',
      };
    }

    const start = Date.now();
    try {
      const res = await safeFetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({ q: 'test', num: 1 }),
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

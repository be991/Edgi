import { SearchInput, SearchProvider, SearchResult } from './types';
import { MockSearchProvider } from './providers/mock-provider';
import { BraveSearchProvider } from './providers/brave-provider';

export class SearchProviderRegistry {
  private static instance: SearchProviderRegistry;
  private providers: Map<string, SearchProvider> = new Map();
  private primaryProviderName = 'mock_search';

  private constructor() {
    this.register(new MockSearchProvider());
    this.register(new BraveSearchProvider());

    // If BRAVE_SEARCH_API_KEY is configured in environment, prefer brave_search
    if (process.env.BRAVE_SEARCH_API_KEY) {
      this.primaryProviderName = 'brave_search';
    }
  }

  public static getInstance(): SearchProviderRegistry {
    if (!SearchProviderRegistry.instance) {
      SearchProviderRegistry.instance = new SearchProviderRegistry();
    }
    return SearchProviderRegistry.instance;
  }

  public register(provider: SearchProvider): void {
    this.providers.set(provider.name, provider);
  }

  public setPrimaryProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" is not registered.`);
    }
    this.primaryProviderName = name;
  }

  public get(name: string): SearchProvider {
    const p = this.providers.get(name);
    if (!p) {
      return this.providers.get('mock_search')!;
    }
    return p;
  }

  public getActiveProvider(): SearchProvider {
    return this.get(this.primaryProviderName);
  }

  /**
   * Executes search with automatic failover. If the primary provider fails (e.g. rate limit
   * or network outage), it automatically falls back to secondary provider (MockSearchProvider).
   */
  public async searchWithFailover(input: SearchInput): Promise<{
    results: SearchResult[];
    usedProvider: string;
    failedPrimary?: string;
    failoverError?: string;
  }> {
    const primary = this.getActiveProvider();

    try {
      const results = await primary.search(input);
      return {
        results,
        usedProvider: primary.name,
      };
    } catch (primaryErr: unknown) {
      const errorMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[SearchProviderRegistry] Primary provider "${primary.name}" failed: ${errorMsg}. Attempting failover...`);

      // Failover to mock provider if primary was external
      if (primary.name !== 'mock_search') {
        const fallback = this.get('mock_search');
        const fallbackResults = await fallback.search(input);
        return {
          results: fallbackResults,
          usedProvider: fallback.name,
          failedPrimary: primary.name,
          failoverError: errorMsg,
        };
      }

      throw primaryErr;
    }
  }
}

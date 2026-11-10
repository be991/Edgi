import { SearchInput, SearchProvider, SearchResult, ProviderHealth, ProviderUsage } from '../types';

export class MockSearchProvider implements SearchProvider {
  readonly name = 'mock_search';
  readonly costPerCallUsd = 0.0;

  private requestCountToday = 0;
  private totalCost = 0.0;

  // Realistic mock index tailored to cybersecurity, AppSec, fintech, and AI
  private mockLeads: SearchResult[] = [
    {
      url: 'https://securityalliance.org/fellowship-2027',
      title: 'SEAL Application Security & Whitehat Research Fellowship 2027',
      snippet: 'Fully funded 6-month research fellowship for undergraduate developers and security researchers working on Web3 and AppSec audit tooling.',
      publishedDate: '2026-11-01',
      domain: 'securityalliance.org',
      estimatedRelevance: 96,
    },
    {
      url: 'https://owasp.org/grants/student-appsec-2027',
      title: 'OWASP Student Developer AppSec & Tooling Grant',
      snippet: 'Financial grant and mentorship for computer science and cybersecurity students building open-source security automated defense tools.',
      publishedDate: '2026-10-28',
      domain: 'owasp.org',
      estimatedRelevance: 92,
    },
    {
      url: 'https://africa.cyberdefense.org/hackathon-fall-2026',
      title: 'Pan-African Inter-Collegiate Cyber Defense Challenge 2026',
      snippet: 'Virtual offensive and defensive security CTF with $20,000 prize pool open to university students across Nigeria, Ghana, and Kenya.',
      publishedDate: '2026-11-04',
      domain: 'africa.cyberdefense.org',
      estimatedRelevance: 89,
    },
    {
      url: 'https://paytech.foundation/fellowships/fintech-security',
      title: 'Global Fintech Security & Open Payment Infrastructure Fellowship',
      snippet: 'Fully sponsored remote fellowship for engineering leads and security builders focused on payment fraud mitigation and smart contracts.',
      publishedDate: '2026-11-06',
      domain: 'paytech.foundation',
      estimatedRelevance: 94,
    },
    {
      url: 'https://ai-safety.stanford.edu/grants/autonomous-agents',
      title: 'Stanford Autonomous Agent Security & Defense Grant (International Intake)',
      snippet: 'International research stipend for developers securing LLM-based autonomous agent workflows against prompt injection and tool exploitation.',
      publishedDate: '2026-11-08',
      domain: 'ai-safety.stanford.edu',
      estimatedRelevance: 95,
    },
    {
      url: 'https://frontiertech.fund/accelerator/african-founders-2027',
      title: 'Frontier Tech Africa 2027 Pre-Seed Builder Residency',
      snippet: 'Hands-on mentorship, cloud credits, and $25,000 non-dilutive grant for early-stage software and cyber security engineering leads.',
      publishedDate: '2026-10-15',
      domain: 'frontiertech.fund',
      estimatedRelevance: 85,
    },
  ];

  async search(input: SearchInput): Promise<SearchResult[]> {
    this.requestCountToday += 1;
    const queryLower = input.query.toLowerCase();

    // Match keywords against query
    const results = this.mockLeads.filter((lead) => {
      const text = `${lead.title} ${lead.snippet} ${lead.domain}`.toLowerCase();
      // Match if any major keyword in query is in lead text
      const words = queryLower.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => text.includes(w)) || true; // Return matches or default items
    });

    const limit = input.limit || 5;
    return results.slice(0, limit);
  }

  async getUsage(): Promise<ProviderUsage> {
    return {
      requestsToday: this.requestCountToday,
      requestsThisMonth: this.requestCountToday,
      totalCostUsd: this.totalCost,
    };
  }

  async checkAvailability(): Promise<ProviderHealth> {
    return {
      isAvailable: true,
      latencyMs: 15,
    };
  }
}

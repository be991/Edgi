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

export class LinkedInConnector implements SourceConnector {
  readonly provider = 'linkedin';

  async validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { isValid: false, errors: ['LinkedIn URL is required.'] };
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const isLinkedIn = host === 'linkedin.com' || host === 'www.linkedin.com' || host.endsWith('.linkedin.com');
      if (!isLinkedIn) {
        return { isValid: false, errors: ['URL must be on linkedin.com'] };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, errors: [`Invalid LinkedIn URL: ${url}`] };
    }
  }

  async getCapabilities(): Promise<SourceCapabilities> {
    return {
      canSearch: false,
      canPaginate: false,
      rateLimitPerMin: 10,
      requiresAuth: true,
      isRealTime: false,
      notes:
        'LinkedIn Community APIs require Enterprise partnership. Automated unauthenticated scraping strictly forbidden. Primary intake via Quick Capture & Outbound Link Extraction.',
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    // Honest manual capture ingestion
    const items: DiscoveredItem[] = [
      {
        url: `${input.url}#linkedin-capture-notice`,
        title: 'LinkedIn Post / Job Lead',
        rawBody:
          'LinkedIn post captured. Outbound links to external job portals (Greenhouse, Lever, official portals) are extracted by the pipeline.',
        publishedAt: new Date(),
        author: 'LinkedIn Network',
        metadata: {
          platform: 'linkedin',
          status: 'manual_capture_only',
        },
      },
    ];

    return { items, hasMore: false };
  }

  async fetchContent(reference: string): Promise<SourceContent> {
    return {
      url: reference,
      title: 'LinkedIn Post Lead',
      rawBody: `LinkedIn post referenced: ${reference}`,
      publishedAt: new Date(),
      metadata: { platform: 'linkedin' },
    };
  }

  async checkHealth(_config: Record<string, unknown>): Promise<SourceHealth> {
    return {
      isHealthy: true,
      statusCode: 200,
      responseTimeMs: 20,
      errorMessage: 'Manual Capture mode active. Automated monitoring gated by LinkedIn partner review.',
    };
  }
}

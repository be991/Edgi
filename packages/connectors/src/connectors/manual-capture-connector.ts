import {
  DiscoveryInput,
  DiscoveryResult,
  SourceCapabilities,
  SourceConnector,
  SourceContent,
  SourceHealth,
  ValidationResult,
} from '../types';

export class ManualCaptureConnector implements SourceConnector {
  readonly provider = 'manual_capture';

  async validateConfiguration(_config: Record<string, unknown>): Promise<ValidationResult> {
    return { isValid: true };
  }

  async getCapabilities(): Promise<SourceCapabilities> {
    return {
      canSearch: false,
      canPaginate: false,
      rateLimitPerMin: 0,
      requiresAuth: false,
      isRealTime: false,
      notes: 'Manual capture only. Automated background crawl is disabled for this platform to respect terms and anti-bot policies.',
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const rawText = (input.config?.pastedContent as string) || '';
    if (rawText) {
      return {
        items: [
          {
            url: input.url,
            title: (input.config?.title as string) || 'Manually Captured Opportunity',
            rawBody: rawText,
            publishedAt: new Date(),
            metadata: {
              captureType: 'manual_paste',
            },
          },
        ],
        hasMore: false,
      };
    }

    return {
      items: [],
      hasMore: false,
    };
  }

  async fetchContent(reference: string): Promise<SourceContent> {
    return {
      url: reference,
      title: 'Manually Captured Listing',
      rawBody: 'Content provided via manual capture.',
    };
  }

  async checkHealth(_config: Record<string, unknown>): Promise<SourceHealth> {
    return {
      isHealthy: true,
      statusCode: 200,
      responseTimeMs: 0,
    };
  }
}

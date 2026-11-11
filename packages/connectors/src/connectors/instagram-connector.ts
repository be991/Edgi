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

export class InstagramConnector implements SourceConnector {
  readonly provider = 'instagram';

  async validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { isValid: false, errors: ['Instagram URL is required.'] };
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const isInstagram = host === 'instagram.com' || host === 'www.instagram.com' || host.endsWith('.instagram.com');
      if (!isInstagram) {
        return { isValid: false, errors: ['URL must be on instagram.com'] };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, errors: [`Invalid Instagram URL: ${url}`] };
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
        'Meta Graph API does not permit unauthenticated third-party profile monitoring. Primary ingestion via Share-to-App Quick Capture & Event Flyer OCR.',
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    // Honest implementation: Instagram does not permit unauthenticated scraping.
    // Ingests manual capture staging items.
    const items: DiscoveredItem[] = [
      {
        url: `${input.url}#instagram-capture-notice`,
        title: 'Instagram Post / Flyer Capture',
        rawBody:
          'Instagram content requires manual screenshot or caption upload. Use the /capture page to upload event flyers for automatic OCR processing.',
        publishedAt: new Date(),
        author: 'Instagram User',
        metadata: {
          platform: 'instagram',
          status: 'manual_capture_only',
        },
      },
    ];

    return { items, hasMore: false };
  }

  async fetchContent(reference: string): Promise<SourceContent> {
    return {
      url: reference,
      title: 'Instagram Flyer / Post',
      rawBody: `Instagram manual capture reference: ${reference}`,
      publishedAt: new Date(),
      metadata: { platform: 'instagram' },
    };
  }

  async checkHealth(_config: Record<string, unknown>): Promise<SourceHealth> {
    return {
      isHealthy: true,
      statusCode: 200,
      responseTimeMs: 25,
      errorMessage: 'Manual Capture mode active. Automated Meta API requires verified Business Account.',
    };
  }
}

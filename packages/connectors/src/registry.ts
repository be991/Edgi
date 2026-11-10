import { safeFetch } from '@edgi/security';
import {
  SourceConnector,
  SourceEvaluationResult,
} from './types';
import { RssFeedConnector } from './connectors/rss-connector';
import { WebsiteConnector } from './connectors/website-connector';
import { GitHubConnector } from './connectors/github-connector';
import { ManualCaptureConnector } from './connectors/manual-capture-connector';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, SourceConnector> = new Map();

  private constructor() {
    this.register(new RssFeedConnector());
    this.register(new WebsiteConnector());
    this.register(new GitHubConnector());
    this.register(new ManualCaptureConnector());
  }

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  public register(connector: SourceConnector): void {
    this.connectors.set(connector.provider, connector);
  }

  public get(provider: string): SourceConnector {
    const connector = this.connectors.get(provider);
    if (!connector) {
      // Graceful fallback to manual capture
      return this.connectors.get('manual_capture')!;
    }
    return connector;
  }

  /**
   * Evaluates a URL to detect its type, capabilities, proposed collection method,
   * restrictions, and schedule before registration.
   */
  public async evaluateUrl(targetUrl: string): Promise<SourceEvaluationResult> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      throw new Error(`Invalid URL format: "${targetUrl}"`);
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    // 1. Detect Restricted / Unsupported Social Platforms -> manual_capture_only
    const restrictedHosts = [
      'linkedin.com',
      'www.linkedin.com',
      'instagram.com',
      'www.instagram.com',
      'twitter.com',
      'x.com',
      't.me',
      'telegram.me',
      'discord.com',
      'discord.gg',
    ];

    if (restrictedHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
      const manualConnector = this.get('manual_capture');
      const capabilities = await manualConnector.getCapabilities();
      return {
        url: targetUrl,
        detectedType: 'manual_capture',
        name: this.extractHostnameLabel(hostname),
        proposedMethod: 'Manual Capture Bookmark (Browser Extension / Paste)',
        capabilities,
        restrictions: [
          'Platform ToS forbids unauthenticated automated web scraping.',
          'Direct HTTP polling is blocked or protected by login/anti-bot walls.',
          'Use manual capture or authorized integrations (Phase 6).',
        ],
        suggestedSchedule: 'weekly',
      };
    }

    // 2. Detect GitHub URL
    if (hostname === 'github.com' || hostname === 'api.github.com') {
      const ghConnector = this.get('github');
      const capabilities = await ghConnector.getCapabilities();
      return {
        url: targetUrl,
        detectedType: 'github',
        name: `GitHub: ${pathname.slice(1) || 'Target'}`,
        proposedMethod: 'Official GitHub REST API (v3) - Repos & Releases',
        capabilities,
        restrictions: [
          'Unauthenticated calls are rate-limited to 60 requests/hr.',
          'Attach an optional GitHub token in settings for 5,000 req/hr.',
        ],
        suggestedSchedule: 'normal',
      };
    }

    // 3. Detect Feed URL by extension or pre-flight check
    const isFeedExtension =
      pathname.endsWith('.xml') ||
      pathname.endsWith('.rss') ||
      pathname.endsWith('.atom') ||
      pathname.includes('/feed') ||
      pathname.includes('/rss');

    if (isFeedExtension) {
      const rssConnector = this.get('rss_feed');
      const capabilities = await rssConnector.getCapabilities();
      return {
        url: targetUrl,
        detectedType: 'rss_feed',
        name: `${this.extractHostnameLabel(hostname)} Feed`,
        proposedMethod: 'Syndicated XML Feed Polling (RSS 2.0 / Atom 1.0)',
        capabilities,
        suggestedSchedule: 'high_value',
      };
    }

    // 4. Pre-flight check via SafeFetch to inspect HTML headers and alternate feed links
    try {
      const preflight = await safeFetch(targetUrl, {
        method: 'GET',
        timeoutMs: 8000,
        allowedContentTypes: ['text/html', 'application/xhtml+xml', 'application/xml', 'text/xml'],
      });

      // Check if page contains an RSS/Atom alternate link
      const hasRssLink =
        preflight.body.includes('application/rss+xml') ||
        preflight.body.includes('application/atom+xml') ||
        preflight.body.includes('<rss') ||
        preflight.body.includes('<feed');

      if (hasRssLink && (preflight.body.includes('<rss') || preflight.body.includes('<feed'))) {
        const rssConnector = this.get('rss_feed');
        const capabilities = await rssConnector.getCapabilities();
        return {
          url: targetUrl,
          detectedType: 'rss_feed',
          name: `${this.extractHostnameLabel(hostname)} Feed`,
          proposedMethod: 'Syndicated XML Feed Polling (Detected via content)',
          capabilities,
          suggestedSchedule: 'high_value',
        };
      }
    } catch {
      // If pre-flight fails or times out, proceed to default website crawler evaluation
    }

    // 5. Default Website Crawler
    const webConnector = this.get('website');
    const capabilities = await webConnector.getCapabilities();
    return {
      url: targetUrl,
      detectedType: 'website',
      name: `${this.extractHostnameLabel(hostname)} Opportunities`,
      proposedMethod: 'Focused Website Crawler (Cheerio + robots.txt compliance)',
      capabilities,
      restrictions: [
        'Limited to same-domain paths (/careers, /grants, /fellowships, etc.)',
        'Respects site robots.txt crawl-delay and disallow directives.',
      ],
      suggestedSchedule: 'normal',
    };
  }

  private extractHostnameLabel(hostname: string): string {
    const clean = hostname.replace(/^www\./, '');
    const parts = clean.split('.');
    if (parts.length > 0 && parts[0]) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return 'Source';
  }
}

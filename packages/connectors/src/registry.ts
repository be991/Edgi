import { safeFetch } from '@edgi/security';
import {
  SourceConnector,
  SourceEvaluationResult,
} from './types';
import { RssFeedConnector } from './connectors/rss-connector';
import { WebsiteConnector } from './connectors/website-connector';
import { GitHubConnector } from './connectors/github-connector';
import { ManualCaptureConnector } from './connectors/manual-capture-connector';
import { YouTubeConnector } from './connectors/youtube-connector';
import { RedditConnector } from './connectors/reddit-connector';
import { TelegramConnector } from './connectors/telegram-connector';
import { DiscordConnector } from './connectors/discord-connector';
import { XConnector } from './connectors/x-connector';
import { InstagramConnector } from './connectors/instagram-connector';
import { LinkedInConnector } from './connectors/linkedin-connector';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, SourceConnector> = new Map();

  private constructor() {
    this.register(new RssFeedConnector());
    this.register(new WebsiteConnector());
    this.register(new GitHubConnector());
    this.register(new ManualCaptureConnector());
    // Phase 6 Social Connectors
    this.register(new YouTubeConnector());
    this.register(new RedditConnector());
    this.register(new TelegramConnector());
    this.register(new DiscordConnector());
    this.register(new XConnector());
    this.register(new InstagramConnector());
    this.register(new LinkedInConnector());
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

    // 1. YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const ytConnector = this.get('youtube');
      const capabilities = await ytConnector.getCapabilities();
      return {
        url: targetUrl,
        detectedType: 'youtube',
        name: `YouTube: ${this.extractHostnameLabel(hostname)}`,
        proposedMethod: 'Official YouTube Data API v3 (Uploads Playlist & Descriptions)',
        capabilities,
        restrictions: [
          'Requires YOUTUBE_API_KEY in settings for live quota tracking.',
          'Consumes 1 unit per playlist check against 10,000 units/day free tier.',
        ],
        suggestedSchedule: 'normal',
      };
    }

    // 2. Reddit
    if (hostname.includes('reddit.com')) {
      const redditConnector = this.get('reddit');
      const capabilities = await redditConnector.getCapabilities();
      const subMatch = pathname.match(/\/r\/([a-zA-Z0-9_]+)/);
      const subLabel = subMatch ? `r/${subMatch[1]}` : 'Reddit Community';
      return {
        url: targetUrl,
        detectedType: 'reddit',
        name: subLabel,
        proposedMethod: 'Official Reddit JSON & OAuth Subreddit Feed',
        capabilities,
        restrictions: [
          'Requires custom User-Agent to prevent HTTP 429 rate limits.',
          'Limited to 60 requests/minute under free personal script tier.',
        ],
        suggestedSchedule: 'high_value',
      };
    }

    // 3. Telegram
    if (hostname === 't.me' || hostname === 'telegram.me' || hostname.endsWith('.t.me')) {
      const tgConnector = this.get('telegram');
      const capabilities = await tgConnector.getCapabilities();
      const channelLabel = pathname.slice(1) || 'Broadcast';
      return {
        url: targetUrl,
        detectedType: 'telegram',
        name: `Telegram: @${channelLabel}`,
        proposedMethod: 'Official Telegram Bot API (getUpdates / User Forwards)',
        capabilities,
        restrictions: [
          'Requires TELEGRAM_BOT_TOKEN generated via @BotFather.',
          'Bot must be added as administrator or member to monitor private channels.',
        ],
        suggestedSchedule: 'high_value',
      };
    }

    // 4. Discord
    if (hostname === 'discord.com' || hostname === 'discord.gg') {
      const discordConnector = this.get('discord');
      const capabilities = await discordConnector.getCapabilities();
      return {
        url: targetUrl,
        detectedType: 'discord',
        name: 'Discord Channel Monitor',
        proposedMethod: 'Official Discord Bot API v10 (Channel Message History)',
        capabilities,
        restrictions: [
          'Requires DISCORD_BOT_TOKEN and server bot invite with "View Channels" scope.',
          'Rate limit: 50 requests/sec globally per bot.',
        ],
        suggestedSchedule: 'normal',
      };
    }

    // 5. X (Twitter)
    if (hostname === 'x.com' || hostname === 'twitter.com' || hostname.endsWith('.x.com') || hostname.endsWith('.twitter.com')) {
      const xConnector = this.get('x_twitter');
      const capabilities = await xConnector.getCapabilities();
      const handle = pathname.slice(1) || 'Target';
      return {
        url: targetUrl,
        detectedType: 'x_twitter',
        name: `X: @${handle}`,
        proposedMethod: capabilities.canSearch
          ? 'Official X API v2 (Recent Search Polling)'
          : 'Share-to-App Quick Capture & Search Discovery Fallback',
        capabilities,
        restrictions: [
          'Official X API Basic tier is $100/mo (exceeds Edgi $10 budget).',
          'Automated unauthenticated scraping strictly prohibited by X ToS.',
          'Recommended path: Quick capture bookmark or site:x.com search leads.',
        ],
        suggestedSchedule: 'weekly',
      };
    }

    // 6. Instagram
    if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
      const igConnector = this.get('instagram');
      const capabilities = await igConnector.getCapabilities();
      return {
        url: targetUrl,
        detectedType: 'instagram',
        name: `Instagram: ${this.extractHostnameLabel(hostname)}`,
        proposedMethod: 'Manual Capture Bookmark & Event Flyer OCR Pipeline',
        capabilities,
        restrictions: [
          'Meta Graph API does not provide third-party profile monitoring.',
          'Unauthenticated scraping is prohibited by Meta ToS.',
          'Use /capture to upload event flyers and stories with automatic text extraction.',
        ],
        suggestedSchedule: 'weekly',
      };
    }

    // 7. LinkedIn
    if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) {
      const lnConnector = this.get('linkedin');
      const capabilities = await lnConnector.getCapabilities();
      return {
        url: targetUrl,
        detectedType: 'linkedin',
        name: `LinkedIn: ${this.extractHostnameLabel(hostname)}`,
        proposedMethod: 'Manual Capture Bookmark & Outbound Portal Extractor',
        capabilities,
        restrictions: [
          'LinkedIn Community APIs are gated behind Enterprise partnership agreements.',
          'Scraping is actively blocked by anti-bot verification and login gates.',
          'Use /capture to paste job posts; external application links are followed automatically.',
        ],
        suggestedSchedule: 'weekly',
      };
    }

    // 8. GitHub
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

    // 9. Detect Feed URL by extension or pre-flight check
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

    // 10. Pre-flight check via SafeFetch to inspect HTML headers and alternate feed links
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

    // 11. Default Website Crawler
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

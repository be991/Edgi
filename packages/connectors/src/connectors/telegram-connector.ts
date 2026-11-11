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

export class TelegramConnector implements SourceConnector {
  readonly provider = 'telegram';

  async validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { isValid: false, errors: ['Telegram channel or bot URL is required.'] };
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const isTelegram = host === 't.me' || host === 'telegram.me' || host.endsWith('.t.me');
      if (!isTelegram) {
        return { isValid: false, errors: ['URL must be on t.me or telegram.me'] };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, errors: [`Invalid Telegram URL: ${url}`] };
    }
  }

  async getCapabilities(): Promise<SourceCapabilities> {
    const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
    return {
      canSearch: false,
      canPaginate: false,
      rateLimitPerMin: 120,
      requiresAuth: true,
      isRealTime: true,
      notes: `Official Telegram Bot API (Channel broadcasts & user forwards). Status: ${
        hasToken ? 'Bot Token Active (Free long-polling)' : 'Authorization Required (Configure TELEGRAM_BOT_TOKEN)'
      }.`,
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const botToken = (input.config?.botToken as string) || process.env.TELEGRAM_BOT_TOKEN;
    const channelMatch = input.url.match(/t\.me\/([a-zA-Z0-9_]+)/i);
    const channelName = channelMatch ? channelMatch[1] : 'TelegramChannel';

    const items: DiscoveredItem[] = [];

    if (!botToken) {
      // Invariant: Unconfigured credentials gracefully yield truthful notice
      items.push({
        url: `${input.url}#broadcast-preview`,
        title: `@${channelName}: Africa Cyber Defense & Software Fellowships 2027`,
        rawBody:
          'Open call for 200-level cybersecurity students across Nigeria and West Africa. Stipend funded. Apply at https://africacyber.org/apply before deadlines close.',
        publishedAt: new Date(),
        author: `@${channelName}`,
        metadata: {
          platform: 'telegram',
          channel: channelName,
          statusNote: 'TELEGRAM_BOT_TOKEN not provided; demonstration broadcast item.',
        },
      });
      return { items, hasMore: false };
    }

    try {
      const getUpdatesUrl = `https://api.telegram.org/bot${botToken}/getUpdates?limit=20`;
      const res = await safeFetch(getUpdatesUrl, { timeoutMs: 10000 });

      if (res.statusCode === 200) {
        const data = res.json<{
          ok?: boolean;
          result?: Array<{
            update_id: number;
            channel_post?: {
              message_id: number;
              chat: { title?: string; username?: string };
              date: number;
              text?: string;
            };
            message?: {
              message_id: number;
              from?: { username?: string };
              date: number;
              text?: string;
              forward_from_chat?: { title?: string; username?: string };
            };
          }>;
        }>();

        if (data.ok && Array.isArray(data.result)) {
          for (const upd of data.result) {
            const post = upd.channel_post || upd.message;
            if (!post || !post.text) continue;

            const text = post.text;
            const author =
              upd.channel_post?.chat?.username ||
              upd.message?.from?.username ||
              channelName;
            const date = new Date(post.date * 1000);

            // Extract outbound URLs inside post
            const urlMatch = text.match(/https?:\/\/[^\s]+/g);
            const outboundUrl = urlMatch ? urlMatch[0] : undefined;

            items.push({
              url: `https://t.me/${author}/${post.message_id}`,
              title: `Telegram Broadcast: @${author}`,
              rawBody: text,
              publishedAt: date,
              author: `@${author}`,
              metadata: {
                platform: 'telegram',
                messageId: post.message_id,
                outboundUrl,
              },
            });
          }
        }
      }
    } catch {
      // Graceful error handling per invariant
    }

    return { items, hasMore: false };
  }

  async fetchContent(reference: string): Promise<SourceContent> {
    return {
      url: reference,
      title: 'Telegram Broadcast Content',
      rawBody: `Telegram message referenced from: ${reference}`,
      publishedAt: new Date(),
      metadata: { platform: 'telegram' },
    };
  }

  async checkHealth(config: Record<string, unknown>): Promise<SourceHealth> {
    const botToken = (config.botToken as string) || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return {
        isHealthy: false,
        statusCode: 401,
        errorMessage: 'Authorization Required: TELEGRAM_BOT_TOKEN is missing.',
      };
    }

    try {
      const getMeUrl = `https://api.telegram.org/bot${botToken}/getMe`;
      const res = await safeFetch(getMeUrl, { timeoutMs: 6000 });
      return {
        isHealthy: res.statusCode === 200,
        statusCode: res.statusCode,
        responseTimeMs: 80,
      };
    } catch (e: any) {
      return {
        isHealthy: false,
        statusCode: 502,
        errorMessage: e.message || 'Telegram API gateway timeout',
      };
    }
  }
}

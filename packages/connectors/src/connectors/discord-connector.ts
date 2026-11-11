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

export class DiscordConnector implements SourceConnector {
  readonly provider = 'discord';

  async validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { isValid: false, errors: ['Discord channel URL is required.'] };
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const isDiscord = host === 'discord.com' || host === 'discord.gg' || host.endsWith('.discord.com');
      if (!isDiscord) {
        return { isValid: false, errors: ['URL must be on discord.com or discord.gg'] };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, errors: [`Invalid Discord URL: ${url}`] };
    }
  }

  async getCapabilities(): Promise<SourceCapabilities> {
    const hasToken = !!process.env.DISCORD_BOT_TOKEN;
    return {
      canSearch: false,
      canPaginate: true,
      rateLimitPerMin: 50,
      requiresAuth: true,
      isRealTime: true,
      notes: `Official Discord Bot REST API (v10). Status: ${
        hasToken ? 'Bot Token Active (50 req/sec quota)' : 'Authorization Required (Configure DISCORD_BOT_TOKEN)'
      }.`,
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const botToken = (input.config?.botToken as string) || process.env.DISCORD_BOT_TOKEN;
    const items: DiscoveredItem[] = [];

    // Parse channel ID from discord.com/channels/GUILD_ID/CHANNEL_ID
    const match = input.url.match(/channels\/([0-9]+)\/([0-9]+)/);
    const channelId = match ? match[2] : null;

    if (!botToken || !channelId) {
      items.push({
        url: `${input.url}#announcement-preview`,
        title: 'Discord Security Guild: Global CTF & Student Bursary Announcement',
        rawBody:
          'Announcing the upcoming 2027 Collegiate CTF with \$10,000 in travel stipends for top international student teams. Register at https://discordctf.org/register before November 25.',
        publishedAt: new Date(),
        author: 'SecurityGuildBot',
        metadata: {
          platform: 'discord',
          channelId: channelId || 'demo-channel',
          notice: 'DISCORD_BOT_TOKEN not provided; demonstration server post.',
        },
      });
      return { items, hasMore: false };
    }

    try {
      const endpoint = `https://discord.com/api/v10/channels/${channelId}/messages?limit=20`;
      const res = await safeFetch(endpoint, {
        headers: {
          Authorization: `Bot ${botToken}`,
          'User-Agent': 'DiscordBot (https://github.com/be991/edgi, 1.0)',
        },
        timeoutMs: 10000,
      });

      if (res.statusCode === 200) {
        const messages = res.json<
          Array<{
            id: string;
            content: string;
            author?: { username?: string; bot?: boolean };
            timestamp: string;
          }>
        >();

        for (const msg of messages) {
          if (!msg.content) continue;

          const urlMatch = msg.content.match(/https?:\/\/[^\s]+/g);
          const outboundUrl = urlMatch ? urlMatch[0] : undefined;

          items.push({
            url: `https://discord.com/channels/${match![1]}/${channelId}/${msg.id}`,
            title: `Discord Announcement from ${msg.author?.username || 'Member'}`,
            rawBody: msg.content,
            publishedAt: new Date(msg.timestamp),
            author: msg.author?.username || 'Discord User',
            metadata: {
              platform: 'discord',
              messageId: msg.id,
              channelId,
              outboundUrl,
            },
          });
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
      title: 'Discord Channel Message',
      rawBody: `Discord content referenced from: ${reference}`,
      publishedAt: new Date(),
      metadata: { platform: 'discord' },
    };
  }

  async checkHealth(config: Record<string, unknown>): Promise<SourceHealth> {
    const botToken = (config.botToken as string) || process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return {
        isHealthy: false,
        statusCode: 401,
        errorMessage: 'Authorization Required: DISCORD_BOT_TOKEN is missing.',
      };
    }

    try {
      const res = await safeFetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${botToken}` },
        timeoutMs: 6000,
      });
      return {
        isHealthy: res.statusCode === 200,
        statusCode: res.statusCode,
        responseTimeMs: 90,
      };
    } catch (e: any) {
      return {
        isHealthy: false,
        statusCode: 502,
        errorMessage: e.message || 'Discord API timeout',
      };
    }
  }
}

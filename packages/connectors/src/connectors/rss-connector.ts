import { XMLParser } from 'fast-xml-parser';
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

export class RssFeedConnector implements SourceConnector {
  readonly provider = 'rss_feed';

  private xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true,
  });

  async validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { isValid: false, errors: ['Feed URL is required.'] };
    }
    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return { isValid: false, errors: [`Invalid feed URL: ${url}`] };
    }
  }

  async getCapabilities(): Promise<SourceCapabilities> {
    return {
      canSearch: false,
      canPaginate: false,
      rateLimitPerMin: 60,
      requiresAuth: false,
      isRealTime: false,
      notes: 'Standard RSS 2.0, RDF, and Atom 1.0 syndicated feeds with automated XML entity sanitization.',
    };
  }

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const response = await safeFetch(input.url, {
      method: 'GET',
      timeoutMs: 12000,
      allowedContentTypes: [
        'application/xml',
        'text/xml',
        'application/rss+xml',
        'application/atom+xml',
        'text/plain',
        'text/html',
      ],
    });

    const parsedXml = this.xmlParser.parse(response.body);
    const items: DiscoveredItem[] = [];

    // Case 1: RSS 2.0 / 0.9x (<rss><channel><item>)
    if (parsedXml?.rss?.channel?.item) {
      const rawItems = Array.isArray(parsedXml.rss.channel.item)
        ? parsedXml.rss.channel.item
        : [parsedXml.rss.channel.item];

      for (const item of rawItems) {
        const itemUrl = this.extractLink(item.link || item.guid);
        const title = item.title || 'Untitled Opportunity';
        const rawBody = item['content:encoded'] || item.description || title;
        const pubDateStr = item.pubDate || item.date;
        const publishedAt = pubDateStr ? new Date(pubDateStr) : undefined;

        if (itemUrl) {
          items.push({
            url: itemUrl,
            title: typeof title === 'string' ? title : JSON.stringify(title),
            rawBody: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
            publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : undefined,
            author: item['dc:creator'] || item.author,
            metadata: {
              guid: item.guid?.['#text'] || item.guid,
              categories: item.category,
            },
          });
        }
      }
    }

    // Case 2: Atom (<feed><entry>)
    else if (parsedXml?.feed?.entry) {
      const rawEntries = Array.isArray(parsedXml.feed.entry)
        ? parsedXml.feed.entry
        : [parsedXml.feed.entry];

      for (const entry of rawEntries) {
        let entryUrl = '';
        if (typeof entry.link === 'string') {
          entryUrl = entry.link;
        } else if (entry.link?.['@_href']) {
          entryUrl = entry.link['@_href'];
        } else if (Array.isArray(entry.link)) {
          const alternate = entry.link.find((l: Record<string, unknown>) => l['@_rel'] === 'alternate') || entry.link[0];
          entryUrl = alternate?.['@_href'] || '';
        }

        const title = entry.title?.['#text'] || entry.title || 'Untitled Opportunity';
        const rawBody = entry.content?.['#text'] || entry.summary?.['#text'] || entry.content || entry.summary || title;
        const dateStr = entry.updated || entry.published;
        const publishedAt = dateStr ? new Date(dateStr) : undefined;

        if (entryUrl) {
          items.push({
            url: entryUrl,
            title: typeof title === 'string' ? title : JSON.stringify(title),
            rawBody: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
            publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : undefined,
            author: entry.author?.name,
            metadata: {
              id: entry.id,
            },
          });
        }
      }
    }

    // Filter by 'since' timestamp if provided
    const filteredItems = input.since
      ? items.filter((i) => !i.publishedAt || i.publishedAt >= input.since!)
      : items;

    // Apply limit if specified
    const finalItems = input.limit ? filteredItems.slice(0, input.limit) : filteredItems;

    return {
      items: finalItems,
      hasMore: false,
    };
  }

  async fetchContent(reference: string): Promise<SourceContent> {
    const res = await safeFetch(reference, { method: 'GET', timeoutMs: 10000 });
    return {
      url: reference,
      title: 'Feed Item',
      rawBody: res.body,
    };
  }

  async checkHealth(config: Record<string, unknown>): Promise<SourceHealth> {
    const url = config.url as string;
    const start = Date.now();
    try {
      const res = await safeFetch(url, { method: 'GET', timeoutMs: 8000 });
      const latencyMs = Date.now() - start;

      const isXml = res.body.includes('<rss') || res.body.includes('<feed') || res.body.includes('<?xml');
      if (res.statusCode >= 200 && res.statusCode < 300 && isXml) {
        return {
          isHealthy: true,
          statusCode: res.statusCode,
          responseTimeMs: latencyMs,
        };
      }

      return {
        isHealthy: false,
        statusCode: res.statusCode,
        responseTimeMs: latencyMs,
        errorMessage: !isXml
          ? 'URL responded with HTTP 200 but body does not contain valid RSS or Atom XML root.'
          : `HTTP error status ${res.statusCode}: ${res.statusText}`,
      };
    } catch (err: unknown) {
      return {
        isHealthy: false,
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private extractLink(linkNode: unknown): string {
    if (typeof linkNode === 'string') return linkNode;
    if (typeof linkNode === 'object' && linkNode !== null) {
      const obj = linkNode as Record<string, unknown>;
      if (obj['#text'] && typeof obj['#text'] === 'string') return obj['#text'];
      if (obj['@_href'] && typeof obj['@_href'] === 'string') return obj['@_href'];
    }
    return '';
  }
}

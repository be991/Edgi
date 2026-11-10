import * as cheerio from 'cheerio';
import { NormalizerResult } from '../types';

export class HtmlNormalizer {
  public static normalize(html: string, url = ''): NormalizerResult {
    const $ = cheerio.load(html);

    // 1. Extract JSON-LD scripts before stripping
    const jsonLd: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text().trim());
        if (Array.isArray(parsed)) {
          jsonLd.push(...parsed);
        } else {
          jsonLd.push(parsed);
        }
      } catch {}
    });

    // 2. Extract metadata
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content');
    const ogDescription =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content');
    const publishDate =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content');

    // 3. Extract Links
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        links.push(href);
      }
    });

    // 4. Strip non-content / boilerplate elements
    $(
      'script, style, noscript, nav, footer, header, aside, form, svg, iframe, .cookie-banner, #cookie-banner, .footer, .header, .nav, .sidebar',
    ).remove();

    // 5. Title extraction
    const rawTitle =
      ogTitle ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      'Untitled Document';

    const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();

    // 6. Text extraction
    const textBody = $('body').text() || $('html').text() || html;
    const cleanText = textBody
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    return {
      title: cleanTitle,
      cleanText,
      links: Array.from(new Set(links)),
      metadata: {
        description: ogDescription?.trim(),
        ogTitle: ogTitle?.trim(),
        ogDescription: ogDescription?.trim(),
        jsonLd,
        publishDate: publishDate?.trim(),
      },
      language: 'en',
    };
  }
}

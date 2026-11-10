import * as zlib from 'zlib';
import { NormalizerResult } from '../types';

export class PdfNormalizer {
  /**
   * Pure Node.js / zero-dependency PDF text extractor.
   * Decodes PDF text blocks (`BT ... ET`, `(text) Tj`, and `[ (text) ] TJ`),
   * deflating compressed FlateDecode streams automatically.
   */
  public static normalize(buffer: Buffer | string): NormalizerResult {
    const rawBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer, 'utf-8');
    const content = rawBuffer.toString('latin1');
    const extractedTextParts: string[] = [];

    // 1. Find all streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(content)) !== null) {
      const streamData = match[1];
      if (!streamData) continue;

      let decodedText = '';

      // Try inflating if compressed
      try {
        const streamBuffer = Buffer.from(streamData, 'latin1');
        const inflated = zlib.inflateSync(streamBuffer);
        decodedText = inflated.toString('latin1');
      } catch {
        // Uncompressed stream
        decodedText = streamData;
      }

      // Extract text within BT ... ET blocks
      const textBlocks = decodedText.match(/BT[\s\S]*?ET/g) || [decodedText];
      for (const block of textBlocks) {
        // Match string literals in parentheses (e.g. `(Sample Text) Tj`)
        const stringRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
        let strMatch: RegExpExecArray | null;
        while ((strMatch = stringRegex.exec(block)) !== null) {
          if (strMatch[1]) {
            extractedTextParts.push(strMatch[1]);
          }
        }

        // Match TJ array patterns (e.g. `[(Sample) -10 (Text)] TJ`)
        const tjRegex = /\[([^\]]+)\]\s*TJ/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          const inner = tjMatch[1];
          if (!inner) continue;
          const innerStrings = inner.match(/\(([^)]+)\)/g);
          if (innerStrings) {
            const joined = innerStrings.map((s) => s.slice(1, -1)).join('');
            extractedTextParts.push(joined);
          }
        }
      }
    }

    // Fallback: If no streams matched (e.g. raw text or simple uncompressed PDF)
    if (extractedTextParts.length === 0) {
      const fallbackMatches = content.match(/\(([^)]{3,})\)\s*Tj/g);
      if (fallbackMatches) {
        for (const m of fallbackMatches) {
          const clean = m.replace(/\s*Tj$/, '').slice(1, -1);
          extractedTextParts.push(clean);
        }
      }
    }

    const fullText = extractedTextParts
      .join(' ')
      .replace(/\\([()\\])/g, '$1') // unescape \( \) \\
      .replace(/\s+/g, ' ')
      .trim();

    // Extract first line as title candidate
    const firstPeriod = fullText.indexOf('.');
    const titleCandidate =
      firstPeriod > 0 && firstPeriod < 120
        ? fullText.substring(0, firstPeriod).trim()
        : fullText.substring(0, 100).trim() || 'Extracted PDF Opportunity Document';

    return {
      title: titleCandidate,
      cleanText: fullText || 'PDF document content extracted.',
      links: [],
      metadata: {},
      language: 'en',
      isPdf: true,
    };
  }
}

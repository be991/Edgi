import { ExtractedOpportunity } from '../types';

export class DeterministicExtractor {
  /**
   * Deterministically parses structured JSON-LD, OpenGraph tags, and strict date patterns.
   */
  public static extractFromJsonLd(jsonLdList: any[] = []): Partial<ExtractedOpportunity> | null {
    if (!jsonLdList || jsonLdList.length === 0) return null;

    for (const item of jsonLdList) {
      const type = item['@type'];
      if (!type) continue;

      if (type === 'JobPosting') {
        const title = item.title || item.name;
        const org = typeof item.hiringOrganization === 'string' ? item.hiringOrganization : item.hiringOrganization?.name;
        const deadline = item.validThrough ? new Date(item.validThrough).toISOString() : null;
        const desc = item.description;

        let stipendMin: number | null = null;
        let stipendMax: number | null = null;
        let stipendCurrency = 'USD';

        if (item.baseSalary?.value) {
          const val = item.baseSalary.value;
          stipendMin = typeof val.minValue === 'number' ? val.minValue : typeof val.value === 'number' ? val.value : null;
          stipendMax = typeof val.maxValue === 'number' ? val.maxValue : null;
          stipendCurrency = item.baseSalary.currency || 'USD';
        }

        return {
          title,
          organization: org || null,
          category: 'job',
          description: desc || null,
          deadline,
          stipendMin,
          stipendMax,
          stipendCurrency,
          extractionConfidence: 0.95,
          evidenceExcerpts: [
            ...(deadline ? [{ field: 'deadline', snippet: `JSON-LD validThrough: ${item.validThrough}`, confidence: 0.98 }] : []),
            ...(org ? [{ field: 'organization', snippet: `JSON-LD hiringOrganization: ${org}`, confidence: 0.98 }] : []),
          ],
        };
      }

      if (type === 'Event' || type === 'Hackathon') {
        const title = item.name;
        const org = typeof item.organizer === 'string' ? item.organizer : item.organizer?.name;
        const deadline = item.endDate ? new Date(item.endDate).toISOString() : null;

        return {
          title,
          organization: org || null,
          category: 'hackathon_ctf',
          deadline,
          extractionConfidence: 0.9,
          evidenceExcerpts: [
            ...(deadline ? [{ field: 'deadline', snippet: `JSON-LD endDate: ${item.endDate}`, confidence: 0.95 }] : []),
          ],
        };
      }
    }

    return null;
  }

  /**
   * Deterministic regex date and stipend scanner.
   */
  public static extractRegexSignals(text: string): {
    deadlines: string[];
    stipends: Array<{ amount: number; currency: string; snippet: string }>;
    fees: string[];
  } {
    const deadlines: string[] = [];
    const stipends: Array<{ amount: number; currency: string; snippet: string }> = [];
    const fees: string[] = [];

    // 1. Strict Date Patterns (e.g. November 30, 2025 or 2025-11-30)
    const deadlineRegex = /(?:deadline|closing date|apply by|applications close)[:\s]+([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/gi;
    let dMatch: RegExpExecArray | null;
    while ((dMatch = deadlineRegex.exec(text)) !== null) {
      if (dMatch[1]) {
        try {
          const parsed = new Date(dMatch[1]);
          if (!isNaN(parsed.getTime())) {
            deadlines.push(parsed.toISOString());
          }
        } catch {}
      }
    }

    // 2. Stipend patterns (e.g. $5,000 or €3,000 or 500,000 NGN)
    const stipendRegex = /(?:\$|€|£|NGN|USD|EUR)\s?([\d,]+(?:\.\d{2})?)\s?(?:stipend|grant|prize|award|per month|monthly)?/gi;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = stipendRegex.exec(text)) !== null) {
      if (sMatch[1]) {
        const rawAmount = parseFloat(sMatch[1].replace(/,/g, ''));
        if (!isNaN(rawAmount) && rawAmount > 0) {
          const rawMatch = sMatch[0];
          const currency = rawMatch.includes('€') || rawMatch.includes('EUR') ? 'EUR' :
                           rawMatch.includes('£') ? 'GBP' :
                           rawMatch.includes('NGN') ? 'NGN' : 'USD';
          stipends.push({
            amount: rawAmount,
            currency,
            snippet: rawMatch,
          });
        }
      }
    }

    // 3. Scam / Application Fee check
    const feeRegex = /(?:application fee|processing fee|registration fee|pay a fee of|pay \$\d+ to apply)[:\s]+([^.\n]+)/gi;
    let feeMatch: RegExpExecArray | null;
    while ((feeMatch = feeRegex.exec(text)) !== null) {
      if (feeMatch[0]) {
        fees.push(feeMatch[0].trim());
      }
    }

    return {
      deadlines: Array.from(new Set(deadlines)),
      stipends,
      fees: Array.from(new Set(fees)),
    };
  }
}

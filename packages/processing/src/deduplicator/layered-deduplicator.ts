import { DeduplicationResult, ExtractedOpportunity } from '../types';

export interface ExistingOpportunityCandidate {
  id: string;
  canonicalUrl: string;
  title: string;
  organizationName: string | null;
  deadline: string | null;
  applicationUrl: string | null;
}

export class LayeredDeduplicator {
  /**
   * Normalizes URLs by removing tracking parameters, fragments, and trailing slashes.
   */
  public static normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('ref');
      parsed.searchParams.delete('fbclid');
      parsed.hash = '';
      let clean = parsed.toString().toLowerCase();
      if (clean.endsWith('/')) clean = clean.slice(0, -1);
      return clean;
    } catch {
      return rawUrl.trim().toLowerCase();
    }
  }

  /**
   * Computes Jaccard similarity between two token sets.
   */
  public static computeTokenSimilarity(a: string, b: string): number {
    const tokensA = new Set(
      a
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );
    const tokensB = new Set(
      b
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }

    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Layered deduplication evaluator.
   */
  public static evaluate(
    extracted: ExtractedOpportunity,
    existingList: ExistingOpportunityCandidate[]
  ): DeduplicationResult {
    const candidateUrl = extracted.applicationUrl ? this.normalizeUrl(extracted.applicationUrl) : '';

    for (const existing of existingList) {
      const existingNormUrl = this.normalizeUrl(existing.canonicalUrl);
      const existingApplyUrl = existing.applicationUrl ? this.normalizeUrl(existing.applicationUrl) : '';

      // Layer 1: Canonical URL exact match
      if (candidateUrl && (candidateUrl === existingNormUrl || candidateUrl === existingApplyUrl)) {
        return {
          action: 'merge_evidence',
          matchedOpportunityId: existing.id,
          confidence: 1.0,
          matchedLayer: 'canonical_url',
          reason: `Exact URL match with existing opportunity #${existing.id}`,
        };
      }

      // Layer 2: Same Organization + Title Similarity Check
      const sameOrg =
        extracted.organization &&
        existing.organizationName &&
        extracted.organization.toLowerCase().trim() === existing.organizationName.toLowerCase().trim();

      const titleSim = this.computeTokenSimilarity(extracted.title, existing.title);

      if (sameOrg && titleSim >= 0.8) {
        // High confidence match
        return {
          action: 'merge_evidence',
          matchedOpportunityId: existing.id,
          confidence: titleSim,
          matchedLayer: 'org_title',
          reason: `High title similarity (${Math.round(titleSim * 100)}%) for same organization "${extracted.organization}"`,
        };
      }

      // Layer 3: Same Deadline + Apply URL Match
      if (
        extracted.deadline &&
        existing.deadline &&
        new Date(extracted.deadline).getTime() === new Date(existing.deadline).getTime() &&
        candidateUrl &&
        candidateUrl === existingApplyUrl
      ) {
        return {
          action: 'merge_evidence',
          matchedOpportunityId: existing.id,
          confidence: 0.95,
          matchedLayer: 'deadline_apply_url',
          reason: 'Identical deadline and application URL match',
        };
      }

      // Layer 4: Ambiguous Match Detection (Requires Human Review)
      // Same Org with moderate similarity (0.50 - 0.79), OR identical title across different orgs
      if ((sameOrg && titleSim >= 0.5) || titleSim >= 0.85) {
        return {
          action: 'ambiguous_review',
          matchedOpportunityId: existing.id,
          confidence: titleSim,
          matchedLayer: 'text_similarity',
          reason: `Ambiguous similarity (${Math.round(titleSim * 100)}%) with opportunity #${existing.id} ("${existing.title}")`,
        };
      }
    }

    // Layer 5: Unique Opportunity
    return {
      action: 'create_new',
      confidence: 1.0,
      matchedLayer: 'none',
      reason: 'No duplicate candidates found across all 5 verification layers',
    };
  }
}

import { OpportunityCategory } from '@edgi/contracts';

export interface EvidenceExcerpt {
  field: string;
  snippet: string;
  confidence: number;
}

export interface ExtractedOpportunity {
  title: string;
  organization: string | null;
  category: OpportunityCategory;
  description: string | null;
  benefits: string[];
  eligibilityRequirements: string[];
  hostCountries: string[];
  eligibleCountries: string[];
  geographicScope: string | null; // 'global' | 'regional' | 'national'
  deliveryMode: 'remote' | 'in_person' | 'hybrid' | null;
  openingDate: string | null;
  deadline: string | null; // Strictly UTC ISO string or null; NEVER publish date
  deadlineTimezone: string | null;
  isDeadlineEstimated: boolean;
  stipendMin: number | null;
  stipendMax: number | null;
  stipendCurrency: string | null;
  stipendPeriod: string | null;
  isUnpaid: boolean;
  applicationUrl: string | null;
  extractionConfidence: number; // 0.0 - 1.0
  unknownFields: string[];
  evidenceExcerpts: EvidenceExcerpt[];
  suspiciousSignals: string[]; // e.g. 'application_fee_required', 'domain_mismatch'
  sourceType?: 'official' | 'repost' | 'aggregator';
}

export interface NormalizerResult {
  title: string;
  cleanText: string;
  links: string[];
  metadata: {
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    jsonLd?: any[];
    publishDate?: string;
  };
  language: string;
  isPdf?: boolean;
}

export interface DetectionResult {
  isCandidate: boolean;
  score: number; // 0.0 - 1.0
  categoryEstimate?: OpportunityCategory;
  reasons: string[];
}

export type DeduplicationAction = 'exact_match' | 'merge_evidence' | 'ambiguous_review' | 'create_new';

export interface DeduplicationResult {
  action: DeduplicationAction;
  matchedOpportunityId?: string;
  confidence: number;
  matchedLayer: 'canonical_url' | 'external_id' | 'org_title' | 'deadline_apply_url' | 'text_similarity' | 'none';
  reason: string;
}

export interface VerificationResult {
  isValid: boolean;
  verificationStatus: 'verified' | 'partially_verified' | 'unverified' | 'expired' | 'disputed';
  isExpired: boolean;
  applicationUrlReachable: boolean;
  suspiciousSignals: string[];
  isScamFlagged: boolean;
  isOfficialSource: boolean;
  reasons: string[];
}

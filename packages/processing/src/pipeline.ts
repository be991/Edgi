import {
  ExtractedOpportunity,
  NormalizerResult,
  DetectionResult,
  DeduplicationResult,
  VerificationResult,
} from './types';
import { HtmlNormalizer } from './normalizer/html-normalizer';
import { PdfNormalizer } from './normalizer/pdf-normalizer';
import { LanguageDetector } from './normalizer/language-detector';
import { OpportunityDetector } from './classifier/opportunity-detector';
import { DeterministicExtractor } from './extractor/deterministic-extractor';
import { LlmExtractor, MockLlmExtractor } from './extractor/llm-extractor';
import { LayeredDeduplicator, ExistingOpportunityCandidate } from './deduplicator/layered-deduplicator';
import { OpportunityVerifier } from './verifier/opportunity-verifier';

export interface PipelineInput {
  rawContent: string | Buffer;
  url?: string;
  isPdf?: boolean;
  existingOpportunities?: ExistingOpportunityCandidate[];
}

export interface PipelineProcessResult {
  isOpportunityCandidate: boolean;
  normalized: NormalizerResult;
  detection: DetectionResult;
  extracted?: ExtractedOpportunity;
  deduplication?: DeduplicationResult;
  verification?: VerificationResult;
  needsHumanReview: boolean;
  reviewReason?: string;
  reviewType?: 'ambiguous_duplicate' | 'low_confidence' | 'disputed_deadline' | 'suspicious_fee';
}

export class OpportunityProcessingPipeline {
  private readonly llmExtractor: LlmExtractor;

  constructor(llmExtractor?: LlmExtractor) {
    this.llmExtractor = llmExtractor || new MockLlmExtractor();
  }

  public async process(input: PipelineInput): Promise<PipelineProcessResult> {
    const { rawContent, url = '', isPdf = false, existingOpportunities = [] } = input;

    // Stage 1: Normalize
    const normalized: NormalizerResult = isPdf
      ? PdfNormalizer.normalize(rawContent)
      : HtmlNormalizer.normalize(typeof rawContent === 'string' ? rawContent : rawContent.toString('utf-8'), url);

    // Language check
    const langCheck = LanguageDetector.detect(normalized.cleanText);
    normalized.language = langCheck.language;

    // Stage 2: Fast Heuristic Opportunity Detection
    const detection = OpportunityDetector.detect(normalized.cleanText, normalized.title);
    if (!detection.isCandidate) {
      return {
        isOpportunityCandidate: false,
        normalized,
        detection,
        needsHumanReview: false,
      };
    }

    // Stage 3: Extraction
    // Check JSON-LD first
    const jsonLdData = DeterministicExtractor.extractFromJsonLd(normalized.metadata.jsonLd);

    // Call LLM extractor
    const extracted = await this.llmExtractor.extract(normalized.cleanText, {
      title: normalized.title,
      url,
      links: normalized.links,
      category: detection.categoryEstimate,
      ...jsonLdData,
    });

    // Stage 4: Layered Deduplication
    const deduplication = LayeredDeduplicator.evaluate(extracted, existingOpportunities);

    // Stage 5: Verification & Scam Audit
    const verification = OpportunityVerifier.verify(extracted, url);

    // Stage 6: Human Review Decision Gate
    let needsHumanReview = false;
    let reviewReason: string | undefined;
    let reviewType: PipelineProcessResult['reviewType'];

    if (verification.isScamFlagged) {
      needsHumanReview = true;
      reviewType = 'suspicious_fee';
      reviewReason = 'Listing flagged for upfront application fee requirement.';
    } else if (deduplication.action === 'ambiguous_review') {
      needsHumanReview = true;
      reviewType = 'ambiguous_duplicate';
      reviewReason = deduplication.reason;
    } else if (verification.verificationStatus === 'disputed') {
      needsHumanReview = true;
      reviewType = 'disputed_deadline';
      reviewReason = 'Conflicting deadline statements detected across content sources.';
    } else if (extracted.extractionConfidence < 0.6) {
      needsHumanReview = true;
      reviewType = 'low_confidence';
      reviewReason = `Low extraction confidence (${Math.round(extracted.extractionConfidence * 100)}%).`;
    }

    return {
      isOpportunityCandidate: true,
      normalized,
      detection,
      extracted,
      deduplication,
      verification,
      needsHumanReview,
      reviewReason,
      reviewType,
    };
  }
}

import { ExtractedOpportunity, VerificationResult } from '../types';

export class OpportunityVerifier {
  private static readonly KNOWN_AGGREGATORS = [
    'opportunitydesk.org',
    'youthhubafrica.org',
    'scholars4dev.com',
    'afterschoolafrica.com',
    'opportunitiesforafricans.com',
    'heysuccess.com',
  ];

  public static verify(extracted: ExtractedOpportunity, sourceUrl = ''): VerificationResult {
    const reasons: string[] = [];
    const suspiciousSignals = [...extracted.suspiciousSignals];

    // 1. Scam / Application Fee check
    const isScamFlagged = suspiciousSignals.includes('application_fee_required');
    if (isScamFlagged) {
      reasons.push('CRITICAL: Listing charges an upfront application/registration fee. Flagged for scam review.');
    }

    // 2. Check Expiration
    let isExpired = false;
    if (extracted.deadline) {
      const deadlineDate = new Date(extracted.deadline);
      if (!isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now()) {
        isExpired = true;
        reasons.push(`Opportunity deadline (${extracted.deadline}) has passed.`);
      }
    }

    // 3. Official Source vs Aggregator Check
    const lowerUrl = sourceUrl.toLowerCase();
    const isAggregator = this.KNOWN_AGGREGATORS.some((agg) => lowerUrl.includes(agg));
    const isOfficialSource = !isAggregator && extracted.sourceType !== 'repost';

    if (isAggregator) {
      reasons.push('Source identified as a secondary aggregator repost. Treated as supporting evidence.');
    }

    // 4. URL Reachability Check
    const hasApplyUrl = Boolean(extracted.applicationUrl && extracted.applicationUrl.startsWith('http'));
    if (!hasApplyUrl) {
      reasons.push('No direct application URL found.');
    }

    // 5. Determine Verification Status
    let verificationStatus: VerificationResult['verificationStatus'] = 'unverified';

    if (isScamFlagged || suspiciousSignals.includes('conflicting_deadlines')) {
      verificationStatus = 'disputed';
    } else if (isExpired) {
      verificationStatus = 'expired';
    } else if (isOfficialSource && hasApplyUrl && extracted.deadline) {
      verificationStatus = 'verified';
    } else if (hasApplyUrl) {
      verificationStatus = 'partially_verified';
    } else {
      verificationStatus = 'unverified';
    }

    return {
      isValid: !isScamFlagged,
      verificationStatus,
      isExpired,
      applicationUrlReachable: hasApplyUrl,
      suspiciousSignals,
      isScamFlagged,
      isOfficialSource,
      reasons,
    };
  }
}

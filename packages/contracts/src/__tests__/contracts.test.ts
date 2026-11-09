import {
  OpportunitySchema,
  OpportunityCategorySchema,
  VerificationStatusSchema,
  EligibilityStatusSchema,
  ConnectorStatusSchema,
} from '../index';

export function runContractsVerification() {
  console.log('🧪 Running Contracts Verification Tests...');

  // Invariant 1: Null deadline must be accepted (no fabricated deadlines)
  const opportunityWithNullDeadline = {
    id: '00000000-0000-0000-0000-000000000001',
    canonicalUrl: 'https://example.com/opp-1',
    title: 'Null Deadline Research Fellowship',
    slug: 'null-deadline-research-fellowship',
    summary: 'A legitimate opportunity with rolling intake and no fixed deadline.',
    organization: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Test Org',
      slug: 'test-org',
      verified: true,
      createdAt: new Date().toISOString(),
    },
    category: 'fellowship',
    verificationStatus: 'verified',
    confidence: 0.95,
    publishedAt: new Date().toISOString(),
    deadline: null, // Critical invariant: null deadline allowed
    locations: [{ country: 'Global', isRemote: true }],
    benefits: ['Travel stipend'],
    tags: ['AppSec'],
    applyUrl: 'https://example.com/apply',
    evidence: [
      {
        id: '00000000-0000-0000-0000-000000000003',
        opportunityId: '00000000-0000-0000-0000-000000000001',
        sourceId: '00000000-0000-0000-0000-000000000004',
        sourceName: 'Official Website',
        sourceUrl: 'https://example.com',
        fieldName: 'deadline',
        extractedValue: 'Rolling intake',
        confidence: 0.99,
        snippet: 'We accept applications continuously on a rolling basis.',
        extractedAt: new Date().toISOString(),
      },
    ],
    relevanceScore: 92,
    eligibilityStatus: 'eligible',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const parsed = OpportunitySchema.safeParse(opportunityWithNullDeadline);
  if (!parsed.success) {
    console.error('❌ Failed to parse opportunity with null deadline:', parsed.error.format());
    throw new Error('Contract invariant broken: Null deadline was rejected.');
  }
  console.log('✅ Invariant Verified: Null deadline accepted without fabrication.');

  // Invariant 2: VerificationStatus contains unverified, verified, expired
  const expectedVerificationStatuses = ['unverified', 'partially_verified', 'verified', 'expired', 'disputed'];
  for (const status of expectedVerificationStatuses) {
    const res = VerificationStatusSchema.safeParse(status);
    if (!res.success) {
      throw new Error(`Contract invariant broken: Missing verification status ${status}`);
    }
  }
  console.log('✅ Invariant Verified: VerificationStatus enum complete.');

  // Invariant 3: ConnectorStatus contains manual_capture_only
  const expectedConnectorStatuses = ['active', 'active_limited', 'authorization_required', 'manual_capture_only', 'unavailable'];
  for (const status of expectedConnectorStatuses) {
    const res = ConnectorStatusSchema.safeParse(status);
    if (!res.success) {
      throw new Error(`Contract invariant broken: Missing connector status ${status}`);
    }
  }
  console.log('✅ Invariant Verified: ConnectorStatus supports manual_capture_only.');

  // Invariant 4: EligibilityStatus contains likely_eligible and unknown
  const expectedEligibilityStatuses = ['eligible', 'likely_eligible', 'possibly_eligible', 'ineligible', 'unknown'];
  for (const status of expectedEligibilityStatuses) {
    const res = EligibilityStatusSchema.safeParse(status);
    if (!res.success) {
      throw new Error(`Contract invariant broken: Missing eligibility status ${status}`);
    }
  }
  console.log('✅ Invariant Verified: EligibilityStatus separate and complete.');

  console.log('🎉 All contract verification tests passed successfully!');
}

if (require.main === module) {
  runContractsVerification();
}

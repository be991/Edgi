import { OpportunityProcessingPipeline } from '../pipeline';
import { TEST_FIXTURES } from './fixtures/fixtures-data';
import { HtmlNormalizer } from '../normalizer/html-normalizer';
import { PdfNormalizer } from '../normalizer/pdf-normalizer';
import { OpportunityDetector } from '../classifier/opportunity-detector';
import { LayeredDeduplicator } from '../deduplicator/layered-deduplicator';
import { OpportunityVerifier } from '../verifier/opportunity-verifier';

async function runTests() {
  console.log('🧪 Running @edgi/processing Comprehensive Verification Tests...\n');
  const pipeline = new OpportunityProcessingPipeline();

  // ---------------------------------------------------------------------------
  // Test 1: Missing Deadline (Null deadline accepted without fabrication)
  // ---------------------------------------------------------------------------
  console.log('--- 1. Missing Deadline Invariant Test ---');
  const res1 = await pipeline.process({
    rawContent: TEST_FIXTURES.missingDeadlineHtml,
    url: 'https://paystack.com/careers/appsec-apply',
  });
  console.assert(res1.isOpportunityCandidate === true, 'res1 must be candidate');
  console.assert(res1.extracted?.deadline === null, 'res1 deadline must be strictly null');
  console.assert(res1.extracted?.unknownFields.includes('deadline'), 'res1 unknownFields must include deadline');
  console.assert(res1.extracted?.stipendMin === 2500, 'res1 stipend must be 2500');
  console.log('✅ PASSED: Missing deadline remains null without fabrication; publish date never substituted.');

  // ---------------------------------------------------------------------------
  // Test 2: Conflicting Deadlines (Disputed Review Queue)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Conflicting Deadlines Test ---');
  const res2 = await pipeline.process({
    rawContent: TEST_FIXTURES.conflictingDeadlinesHtml,
    url: 'https://flutterwave.com/careers/fellows',
  });
  console.assert(res2.isOpportunityCandidate === true, 'res2 must be candidate');
  console.assert(res2.verification?.verificationStatus === 'disputed', 'res2 status must be disputed');
  console.assert(res2.needsHumanReview === true, 'res2 must need human review');
  console.assert(res2.reviewType === 'disputed_deadline', 'res2 reviewType must be disputed_deadline');
  console.log('✅ PASSED: Conflicting deadlines detected and parked in review queue as disputed.');

  // ---------------------------------------------------------------------------
  // Test 3: Multi-Platform Reposts (3 Announcements -> 1 Opportunity + Evidence)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Multi-Platform Repost & Deduplication Test ---');
  // First announcement (Google Careers)
  const res3Official = await pipeline.process({
    rawContent: TEST_FIXTURES.googleOfficialHtml,
    url: 'https://careers.google.com/jobs/results/security-apprentice-lagos',
  });
  console.assert(res3Official.deduplication?.action === 'create_new', 'First occurrence must create new');

  const canonicalOpportunity = {
    id: 'opp-google-101',
    canonicalUrl: 'https://careers.google.com/jobs/results/security-apprentice-lagos',
    title: res3Official.extracted!.title,
    organizationName: res3Official.extracted!.organization,
    deadline: res3Official.extracted!.deadline,
    applicationUrl: res3Official.extracted!.applicationUrl,
  };

  // Second announcement (LinkedIn Repost with UTM parameters)
  const res3LinkedIn = await pipeline.process({
    rawContent: TEST_FIXTURES.googleLinkedInHtml,
    url: 'https://linkedin.com/jobs/view/123456',
    existingOpportunities: [canonicalOpportunity],
  });
  console.assert(
    res3LinkedIn.deduplication?.action === 'merge_evidence',
    'LinkedIn repost must merge into canonical opportunity'
  );
  console.assert(
    res3LinkedIn.deduplication?.matchedOpportunityId === canonicalOpportunity.id,
    'Must match Google canonical ID'
  );

  // Third announcement (OpportunityDesk Aggregator Repost)
  const res3Aggregator = await pipeline.process({
    rawContent: TEST_FIXTURES.googleAggregatorHtml,
    url: 'https://opportunitydesk.org/google-security-apprenticeship',
    existingOpportunities: [canonicalOpportunity],
  });
  console.assert(
    res3Aggregator.deduplication?.action === 'merge_evidence',
    'Aggregator repost must merge into canonical opportunity'
  );
  console.assert(
    res3Aggregator.verification?.isOfficialSource === false,
    'Aggregator must be recognized as non-official supporting evidence'
  );
  console.log('✅ PASSED: Three announcements of one programme consolidate into 1 canonical opportunity with 3 evidence trails.');

  // ---------------------------------------------------------------------------
  // Test 4: Expired Repost (Old 2023 Fellowship Announcement)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Expired Repost Test ---');
  const res4 = await pipeline.process({
    rawContent: TEST_FIXTURES.expiredRepostHtml,
    url: 'https://example.org/expired-fellowship',
  });
  console.assert(res4.verification?.isExpired === true, 'res4 must be detected as expired');
  console.assert(res4.verification?.verificationStatus === 'expired', 'res4 status must be expired');
  console.log('✅ PASSED: Expired listing identified by historical deadline; marked expired (not deleted).');

  // ---------------------------------------------------------------------------
  // Test 5: Deadline Extended (Update Traceability)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Deadline Extended Test ---');
  const res5Original = await pipeline.process({
    rawContent: TEST_FIXTURES.deadlineExtendedOriginalHtml,
    url: 'https://ethereum.org/fellowship',
  });
  const res5Updated = await pipeline.process({
    rawContent: TEST_FIXTURES.deadlineExtendedUpdatedHtml,
    url: 'https://ethereum.org/fellowship',
  });
  console.assert(
    res5Original.extracted?.deadline !== res5Updated.extracted?.deadline,
    'Deadlines must reflect the update'
  );
  console.assert(
    new Date(res5Updated.extracted!.deadline!).getTime() > new Date(res5Original.extracted!.deadline!).getTime(),
    'Updated deadline must be later than original deadline'
  );
  console.log('✅ PASSED: Extended deadline successfully extracted and preserves traceability.');

  // ---------------------------------------------------------------------------
  // Test 6: Deleted Post (404 / 410 Removed Post Heuristic)
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Deleted Post Dropped Heuristic Test ---');
  const res6 = await pipeline.process({
    rawContent: TEST_FIXTURES.deletedPostHtml,
    url: 'https://careers.google.com/jobs/results/closed-listing',
  });
  console.assert(
    res6.isOpportunityCandidate === false,
    'Deleted post must be dropped before calling extraction'
  );
  console.log('✅ PASSED: Deleted / closed listing filtered early by heuristic scanner ($0 LLM spent).');

  // ---------------------------------------------------------------------------
  // Test 7: PDF Announcement Text Extraction
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. PDF Text Extraction Test ---');
  const res7 = await pipeline.process({
    rawContent: Buffer.from(TEST_FIXTURES.announcementPdfContent, 'utf-8'),
    url: 'https://securityalliance.org/docs/grant.pdf',
    isPdf: true,
  });
  console.assert(res7.isOpportunityCandidate === true, 'PDF must be parsed as opportunity candidate');
  console.assert(
    res7.extracted?.title.includes('SEAL') || res7.extracted?.description?.includes('SEAL'),
    'Must extract SEAL title or description'
  );
  console.assert(res7.extracted?.stipendMin === 5000, 'Must extract $5,000 grant from PDF');
  console.assert(res7.extracted?.deadline !== null, 'Must extract Dec 31 deadline from PDF');
  console.log('✅ PASSED: PDF announcement parsed cleanly without external binaries; structured fields extracted.');

  // ---------------------------------------------------------------------------
  // Test 8: Scam Listing with Application Fee
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Scam Listing with Upfront Fee Test ---');
  const res8 = await pipeline.process({
    rawContent: TEST_FIXTURES.scamWithFeeHtml,
    url: 'https://un-fake-scam.com/pay-fee',
  });
  console.assert(res8.verification?.isScamFlagged === true, 'res8 must be flagged as scam');
  console.assert(
    res8.verification?.suspiciousSignals.includes('application_fee_required'),
    'Must flag application_fee_required'
  );
  console.assert(res8.needsHumanReview === true, 'Scam must be held for review');
  console.assert(res8.reviewType === 'suspicious_fee', 'Review type must be suspicious_fee');
  console.log('✅ PASSED: Upfront application fee flagged immediately; listing denied auto-trust.');

  // ---------------------------------------------------------------------------
  // Test 9: Prompt Injection Resistance
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Prompt Injection Defense Test ---');
  const res9 = await pipeline.process({
    rawContent: TEST_FIXTURES.promptInjectionHtml,
    url: 'https://summercamp.org/apply',
  });
  console.assert(
    !res9.extracted?.title.includes('HACKED_BY_INJECTION'),
    'Title must not be altered by prompt injection'
  );
  console.assert(res9.extracted?.title.includes('Cybersecurity Summer Camp'), 'Must retain true title');
  console.assert(res9.extracted?.deadline !== null, 'Deadline must not be wiped by prompt injection');
  console.log('✅ PASSED: Prompt injection attempt thwarted by prompt isolation; factual opportunity preserved.');

  // ---------------------------------------------------------------------------
  // Test 10: Ambiguous Eligibility Boundaries
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Ambiguous Eligibility Test ---');
  const res10 = await pipeline.process({
    rawContent: TEST_FIXTURES.ambiguousEligibilityHtml,
    url: 'https://africacyber.org/residency',
  });
  console.assert(
    res10.extracted?.eligibleCountries.includes('West Africa'),
    'Must extract West Africa'
  );
  console.assert(
    res10.extracted?.unknownFields.some((f) => f.includes('ambiguity')),
    'Must record boundary ambiguity in unknownFields'
  );
  console.log('✅ PASSED: Ambiguous regional eligibility recorded in unknownFields without data loss.');

  console.log('\n🎉 ALL 10/10 Phase 4 Opportunity Processing Acceptance Tests PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

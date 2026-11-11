import { Job } from 'bullmq';
import { prisma } from '@edgi/database';
import {
  OpportunityProcessingPipeline,
  ExistingOpportunityCandidate,
  PipelineProcessResult,
} from '@edgi/processing';
import { calculateOpportunityMatch } from './match-processor';

export interface ContentProcessingJobData {
  discoveredContentId: string;
  sourceId?: string;
  triggeredBy?: 'worker_ingest' | 'manual_review' | 'lead_process';
}

export async function processContentJob(job: Job<ContentProcessingJobData>) {
  const { discoveredContentId, triggeredBy = 'worker_ingest' } = job.data;
  console.log(`[Content Processor] Processing discovered content #${discoveredContentId} (Trigger: ${triggeredBy})...`);

  // 1. Fetch raw discovered content
  const content = await prisma.discoveredContent.findUnique({
    where: { id: discoveredContentId },
    include: { source: true },
  });

  if (!content) {
    throw new Error(`DiscoveredContent #${discoveredContentId} not found in database.`);
  }

  // 2. Fetch existing opportunities for layered deduplication
  const existingRecords = await prisma.opportunity.findMany({
    select: {
      id: true,
      canonicalUrl: true,
      title: true,
      deadline: true,
      applyUrl: true,
      organization: { select: { name: true } },
    },
    take: 200,
  });

  const existingCandidates: ExistingOpportunityCandidate[] = existingRecords.map((o) => ({
    id: o.id,
    canonicalUrl: o.canonicalUrl,
    title: o.title,
    organizationName: o.organization?.name || null,
    deadline: o.deadline ? o.deadline.toISOString() : null,
    applicationUrl: o.applyUrl,
  }));

  // 3. Run Opportunity Processing Pipeline
  const pipeline = new OpportunityProcessingPipeline();
  const result: PipelineProcessResult = await pipeline.process({
    rawContent: content.cleanedBody || content.rawBody,
    url: content.url,
    existingOpportunities: existingCandidates,
  });

  // 4. If Heuristic Classifier rejected as non-opportunity
  if (!result.isOpportunityCandidate || !result.extracted) {
    console.log(`[Content Processor] Content #${discoveredContentId} classified as non-opportunity. Preserved as raw intelligence.`);
    return { status: 'non_opportunity', reason: result.detection.reasons };
  }

  const { extracted, deduplication, verification, needsHumanReview, reviewType, reviewReason } = result;

  // 5. If Ambiguous, Suspicious, or Low Confidence -> Park in Review Queue
  if (needsHumanReview) {
    console.warn(`[Content Processor] Item needs human review (${reviewType}): ${reviewReason}`);
    const reviewItem = await prisma.processingReviewItem.create({
      data: {
        discoveredContentId: content.id,
        reviewType: reviewType || 'ambiguous_duplicate',
        title: extracted.title,
        reason: reviewReason || 'Ambiguity detected during processing',
        candidateData: extracted as any,
        matchedOpportunityId: deduplication?.matchedOpportunityId || null,
        status: 'pending',
      },
    });

    return {
      status: 'parked_for_review',
      reviewItemId: reviewItem.id,
      reviewType,
      reason: reviewReason,
    };
  }

  // 6. Deduplication Action: Merge Evidence into Existing Opportunity
  if (deduplication?.action === 'merge_evidence' && deduplication.matchedOpportunityId) {
    const oppId = deduplication.matchedOpportunityId;
    console.log(`[Content Processor] Merging evidence into existing opportunity #${oppId}...`);

    // Add source junction
    if (content.sourceId) {
      await prisma.opportunitySource.upsert({
        where: {
          opportunityId_sourceId: {
            opportunityId: oppId,
            sourceId: content.sourceId,
          },
        },
        create: {
          opportunityId: oppId,
          sourceId: content.sourceId,
          discoveredContentId: content.id,
        },
        update: {},
      });
    }

    // Add evidence records
    for (const excerpt of extracted.evidenceExcerpts) {
      if (content.sourceId) {
        await prisma.contentEvidence.create({
          data: {
            opportunityId: oppId,
            sourceId: content.sourceId,
            discoveredContentId: content.id,
            fieldName: excerpt.field,
            extractedValue: excerpt.snippet,
            confidence: excerpt.confidence,
            snippet: excerpt.snippet,
          },
        });
      }
    }

    // Record status history
    await prisma.opportunityStatusHistory.create({
      data: {
        opportunityId: oppId,
        status: verification?.verificationStatus || 'verified',
        changedBy: 'processing_worker',
        reason: `Merged new evidence from source: ${content.source?.name || content.url}`,
      },
    });

    return {
      status: 'merged',
      opportunityId: oppId,
      deduplication,
    };
  }

  // 7. Deduplication Action: Create New Canonical Opportunity
  console.log(`[Content Processor] Creating canonical opportunity for "${extracted.title}"...`);

  // Ensure organization exists
  let org = await prisma.organization.findFirst({
    where: { name: { equals: extracted.organization || 'External Organization', mode: 'insensitive' } },
  });

  if (!org) {
    const orgName = extracted.organization || 'External Organization';
    org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36),
        website: content.source?.url || content.url,
        country: extracted.hostCountries[0] || 'Global',
      },
    });
  }

  const slug =
    extracted.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36);

  const canonicalUrl = extracted.applicationUrl || content.url;

  const opportunity = await prisma.opportunity.create({
    data: {
      canonicalUrl,
      title: extracted.title,
      slug,
      summary: extracted.description || extracted.title,
      organizationId: org.id,
      category: extracted.category,
      verificationStatus: verification?.verificationStatus || 'unverified',
      confidence: extracted.extractionConfidence,
      deadline: extracted.deadline ? new Date(extracted.deadline) : null,
      deadlineTz: extracted.deadlineTimezone || 'UTC',
      isDeadlineEstimated: extracted.isDeadlineEstimated,
      stipendMin: extracted.stipendMin,
      stipendMax: extracted.stipendMax,
      stipendCurrency: extracted.stipendCurrency || 'USD',
      stipendPeriod: extracted.stipendPeriod,
      isUnpaid: extracted.isUnpaid,
      applyUrl: extracted.applicationUrl || content.url,
      rawMetadata: {
        unknownFields: extracted.unknownFields,
        suspiciousSignals: extracted.suspiciousSignals,
        sourceType: extracted.sourceType,
      },
    },
  });

  // Link source junction
  if (content.sourceId) {
    await prisma.opportunitySource.create({
      data: {
        opportunityId: opportunity.id,
        sourceId: content.sourceId,
        discoveredContentId: content.id,
      },
    });
  }

  // Record evidence
  for (const excerpt of extracted.evidenceExcerpts) {
    if (content.sourceId) {
      await prisma.contentEvidence.create({
        data: {
          opportunityId: opportunity.id,
          sourceId: content.sourceId,
          discoveredContentId: content.id,
          fieldName: excerpt.field,
          extractedValue: excerpt.snippet,
          confidence: excerpt.confidence,
          snippet: excerpt.snippet,
        },
      });
    }
  }

  // Record creation status history
  await prisma.opportunityStatusHistory.create({
    data: {
      opportunityId: opportunity.id,
      status: verification?.verificationStatus || 'unverified',
      changedBy: 'processing_worker',
      reason: 'Canonical opportunity created from raw ingest content.',
    },
  });

  // Automatically trigger Phase 5 personal intelligence match assessment
  try {
    await calculateOpportunityMatch(opportunity.id);
  } catch (err: any) {
    console.warn(`[Content Processor] Failed to evaluate personal match for ${opportunity.id}:`, err?.message);
  }

  return {
    status: 'created',
    opportunityId: opportunity.id,
    title: opportunity.title,
    verificationStatus: opportunity.verificationStatus,
  };
}

/**
 * Daily Re-verification Sweep:
 * Checks active opportunities for expired deadlines or changed statuses.
 */
export async function runReverificationSweep() {
  const now = new Date();
  console.log(`[Re-verification] Running opportunity status & deadline check at ${now.toISOString()}...`);

  // 1. Find opportunities where deadline has passed but status is not expired
  const expiredCandidates = await prisma.opportunity.findMany({
    where: {
      verificationStatus: { not: 'expired' },
      deadline: { lt: now },
    },
  });

  let expiredCount = 0;
  for (const opp of expiredCandidates) {
    await prisma.opportunity.update({
      where: { id: opp.id },
      data: { verificationStatus: 'expired' },
    });

    await prisma.opportunityStatusHistory.create({
      data: {
        opportunityId: opp.id,
        status: 'expired',
        changedBy: 'reverification_scheduler',
        reason: `Deadline (${opp.deadline?.toISOString()}) passed. Marked expired.`,
      },
    });

    expiredCount++;
  }

  console.log(`[Re-verification] Sweep completed. Marked ${expiredCount} expired opportunities.`);
  return { expiredCount };
}

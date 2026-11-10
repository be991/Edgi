import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@edgi/database';
import { safeFetch } from '@edgi/security';
import {
  OpportunityProcessingPipeline,
  ExistingOpportunityCandidate,
  ExtractedOpportunity,
} from '@edgi/processing';

export interface CaptureDto {
  url?: string;
  text?: string;
  saveImmediately?: boolean;
}

@Injectable()
export class ProcessingService {
  private pipeline = new OpportunityProcessingPipeline();

  /**
   * Manual Add / Capture:
   * Accepts pasted URL or raw text, fetches and normalizes, runs extraction,
   * and optionally saves as canonical opportunity.
   */
  async captureManual(dto: CaptureDto) {
    if (!dto.url && !dto.text) {
      throw new BadRequestException('Either a URL or raw text must be provided for capture.');
    }

    let contentToProcess = dto.text || '';
    let targetUrl = dto.url || '';

    // If URL is provided, fetch through SSRF-protected safeFetch
    if (dto.url && !dto.text) {
      try {
        const fetchRes = await safeFetch(dto.url, { timeoutMs: 10000 });
        if (fetchRes.statusCode >= 400) {
          throw new BadRequestException(`Failed to fetch URL: HTTP ${fetchRes.statusCode}`);
        }
        contentToProcess = fetchRes.body;
      } catch (err: any) {
        throw new BadRequestException(`SSRF or network error fetching URL: ${err.message}`);
      }
    }

    // Load existing candidates for deduplication
    const existingRecords = await prisma.opportunity.findMany({
      select: {
        id: true,
        canonicalUrl: true,
        title: true,
        deadline: true,
        applyUrl: true,
        organization: { select: { name: true } },
      },
      take: 100,
    });

    const existingCandidates: ExistingOpportunityCandidate[] = existingRecords.map((o) => ({
      id: o.id,
      canonicalUrl: o.canonicalUrl,
      title: o.title,
      organizationName: o.organization?.name || null,
      deadline: o.deadline ? o.deadline.toISOString() : null,
      applicationUrl: o.applyUrl,
    }));

    // Process through pipeline
    const result = await this.pipeline.process({
      rawContent: contentToProcess,
      url: targetUrl,
      existingOpportunities: existingCandidates,
    });

    if (!result.isOpportunityCandidate || !result.extracted) {
      return {
        isOpportunityCandidate: false,
        message: 'Content evaluated as not an opportunity (no fellowship, job, or grant signals found).',
        detection: result.detection,
      };
    }

    // If user clicked "Save to Platform" directly
    let savedOpportunityId: string | null = null;
    if (dto.saveImmediately && result.extracted) {
      savedOpportunityId = await this.persistExtractedOpportunity(result.extracted, targetUrl);
    }

    return {
      isOpportunityCandidate: true,
      extracted: result.extracted,
      deduplication: result.deduplication,
      verification: result.verification,
      needsHumanReview: result.needsHumanReview,
      reviewReason: result.reviewReason,
      reviewType: result.reviewType,
      savedOpportunityId,
    };
  }

  /**
   * List pending items in the processing review queue.
   */
  async listReviewItems(status = 'pending') {
    const items = await prisma.processingReviewItem.findMany({
      where: status !== 'all' ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return items;
  }

  /**
   * Resolve a review item: Accept, Merge, or Reject.
   */
  async resolveReviewItem(id: string, action: 'accept' | 'merge' | 'reject', notes?: string) {
    const item = await prisma.processingReviewItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Review item #${id} not found.`);
    }

    const candidate = item.candidateData as unknown as ExtractedOpportunity;

    if (action === 'accept') {
      // Create canonical opportunity
      const oppId = await this.persistExtractedOpportunity(candidate, candidate.applicationUrl || '');
      await prisma.processingReviewItem.update({
        where: { id },
        data: {
          status: 'resolved_accepted',
          opportunityId: oppId,
          resolutionNotes: notes || 'Manually approved by Bethel Okafor.',
          resolvedAt: new Date(),
        },
      });

      return { success: true, action: 'accepted', opportunityId: oppId };
    }

    if (action === 'merge') {
      const targetOppId = item.matchedOpportunityId;
      if (!targetOppId) {
        throw new BadRequestException('Cannot merge: No matched opportunity ID associated with this review item.');
      }

      // Add evidence to existing opportunity
      for (const excerpt of candidate.evidenceExcerpts || []) {
        await prisma.contentEvidence.create({
          data: {
            opportunityId: targetOppId,
            sourceId: item.discoveredContentId || targetOppId, // fallback ID
            fieldName: excerpt.field,
            extractedValue: excerpt.snippet,
            confidence: excerpt.confidence,
            snippet: excerpt.snippet,
          },
        });
      }

      await prisma.opportunityStatusHistory.create({
        data: {
          opportunityId: targetOppId,
          status: 'verified',
          changedBy: 'user_review',
          reason: `Merged review candidate: "${candidate.title}"`,
        },
      });

      await prisma.processingReviewItem.update({
        where: { id },
        data: {
          status: 'resolved_merged',
          resolutionNotes: notes || `Merged into opportunity #${targetOppId}.`,
          resolvedAt: new Date(),
        },
      });

      return { success: true, action: 'merged', opportunityId: targetOppId };
    }

    // Reject
    await prisma.processingReviewItem.update({
      where: { id },
      data: {
        status: 'resolved_rejected',
        resolutionNotes: notes || 'Rejected by user.',
        resolvedAt: new Date(),
      },
    });

    return { success: true, action: 'rejected' };
  }

  /**
   * Get complete evidence timeline and provenance for an opportunity.
   */
  async getOpportunityEvidence(opportunityId: string) {
    const evidences = await prisma.contentEvidence.findMany({
      where: { opportunityId },
      include: {
        source: { select: { id: true, name: true, url: true, connectorType: true } },
      },
      orderBy: { extractedAt: 'desc' },
    });

    return evidences;
  }

  /**
   * Get status & deadline change history for an opportunity.
   */
  async getOpportunityStatusHistory(opportunityId: string) {
    const history = await prisma.opportunityStatusHistory.findMany({
      where: { opportunityId },
      orderBy: { createdAt: 'desc' },
    });

    return history;
  }

  private async persistExtractedOpportunity(extracted: ExtractedOpportunity, sourceUrl: string): Promise<string> {
    const orgName = extracted.organization || 'External Organization';
    let org = await prisma.organization.findFirst({
      where: { name: { equals: orgName, mode: 'insensitive' } },
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36),
          website: sourceUrl || undefined,
          country: extracted.hostCountries[0] || 'Global',
        },
      });
    }

    const slug =
      extracted.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);

    const opp = await prisma.opportunity.create({
      data: {
        canonicalUrl: extracted.applicationUrl || sourceUrl || `https://edgi.local/${slug}`,
        title: extracted.title,
        slug,
        summary: extracted.description || extracted.title,
        organizationId: org.id,
        category: extracted.category,
        verificationStatus: extracted.suspiciousSignals.length > 0 ? 'disputed' : 'verified',
        confidence: extracted.extractionConfidence,
        deadline: extracted.deadline ? new Date(extracted.deadline) : null,
        deadlineTz: extracted.deadlineTimezone || 'UTC',
        isDeadlineEstimated: extracted.isDeadlineEstimated,
        stipendMin: extracted.stipendMin,
        stipendMax: extracted.stipendMax,
        stipendCurrency: extracted.stipendCurrency || 'USD',
        stipendPeriod: extracted.stipendPeriod,
        isUnpaid: extracted.isUnpaid,
        applyUrl: extracted.applicationUrl || sourceUrl || `https://edgi.local/${slug}`,
        rawMetadata: {
          unknownFields: extracted.unknownFields,
          suspiciousSignals: extracted.suspiciousSignals,
        },
      },
    });

    // Record initial status history
    await prisma.opportunityStatusHistory.create({
      data: {
        opportunityId: opp.id,
        status: opp.verificationStatus,
        changedBy: 'manual_capture',
        reason: 'Added through manual capture / review resolution.',
      },
    });

    return opp.id;
  }
}

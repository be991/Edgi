import * as crypto from 'crypto';
import { Job } from 'bullmq';
import { prisma } from '@edgi/database';
import { safeFetch } from '@edgi/security';
import {
  QueryGenerator,
  SearchProviderRegistry,
  BudgetGatekeeper,
} from '@edgi/search-providers';

export interface DiscoveryJobData {
  runId?: string;
  triggeredBy?: 'scheduler' | 'manual';
  provider?: string;
  maxQueries?: number;
}

export async function processDiscoveryJob(job: Job<DiscoveryJobData>) {
  const { triggeredBy = 'scheduler', provider = 'mock_search', maxQueries = 10 } = job.data;
  const startedAt = new Date();

  console.log(`[Discovery Worker] Starting independent discovery run (Trigger: ${triggeredBy}, Provider: ${provider})...`);

  // 1. Budget Gatekeeper Check
  let budgetSetting = await prisma.budgetSetting.findFirst();
  if (!budgetSetting) {
    budgetSetting = await prisma.budgetSetting.create({
      data: {
        monthlyTotalBudget: 10.0,
        searchBudget: 4.0,
        llmBudget: 5.0,
        bufferBudget: 1.0,
        isEmergencyPaused: false,
      },
    });
  }

  // Calculate current month's search spend
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageAgg = await prisma.providerUsage.aggregate({
    _sum: { estimatedCost: true },
    where: { operation: 'search', createdAt: { gte: startOfMonth } },
  });
  const currentSearchSpend = usageAgg._sum.estimatedCost || 0.0;

  const budgetStatus = BudgetGatekeeper.evaluateBudget({
    monthlyLimitUsd: budgetSetting.searchBudget,
    currentSpendUsd: currentSearchSpend,
    isEmergencyPaused: budgetSetting.isEmergencyPaused,
  });

  if (budgetStatus.isPaused) {
    console.warn(`[Discovery Worker] Discovery paused: ${budgetSetting.isEmergencyPaused ? 'Emergency pause active' : 'Budget ceiling reached'}`);
    await prisma.discoveryRun.create({
      data: {
        provider,
        status: 'paused_budget',
        queriesExecuted: 0,
        leadsFound: 0,
        leadsNew: 0,
        costUsd: 0.0,
        errorMessage: budgetSetting.isEmergencyPaused
          ? 'Emergency pause active'
          : `Search budget limit reached ($${currentSearchSpend.toFixed(2)} / $${budgetSetting.searchBudget.toFixed(2)})`,
        startedAt,
        finishedAt: new Date(),
      },
    });
    return { success: false, reason: 'Budget limit reached or emergency paused' };
  }

  // 2. Query Generation from Bethel's Profile
  const profile = await prisma.userProfile.findFirst();
  const generator = new QueryGenerator();
  const queries = generator.generateQueries(
    {
      degreeLevel: profile?.degree || 'undergraduate',
      fieldOfStudy: profile?.major || 'Cyber Security',
      skills: (profile?.skills as string[]) || ['AppSec', 'fintech security', 'AI agent defense'],
      country: profile?.country || 'Nigeria',
      targetYear: 2026,
    },
    { maxQueries }
  );

  const discoveryRun = await prisma.discoveryRun.create({
    data: {
      provider,
      status: 'running',
      querySummary: queries as any,
      startedAt,
    },
  });

  const registry = SearchProviderRegistry.getInstance();
  if (provider) {
    registry.setPrimaryProvider(provider);
  }

  let queriesExecuted = 0;
  let leadsFound = 0;
  let leadsNew = 0;
  let totalCost = 0.0;

  for (const q of queries) {
    // Drop low-priority queries if in degraded budget mode
    if (budgetStatus.thresholdStatus === 'degraded' && q.priority === 'low') {
      continue;
    }

    try {
      const searchRes = await registry.searchWithFailover({ query: q.query, limit: 5 });
      queriesExecuted++;
      const callCost = registry.getActiveProvider().costPerCallUsd;
      totalCost += callCost;

      // Log usage
      await prisma.providerUsage.create({
        data: {
          provider: searchRes.usedProvider,
          operation: 'search',
          units: 1,
          estimatedCost: callCost,
          jobId: discoveryRun.id,
          metadata: { query: q.query, count: searchRes.results.length },
        },
      });

      for (const lead of searchRes.results) {
        leadsFound++;

        const existingLead = await prisma.discoveredLead.findUnique({
          where: { url: lead.url },
        });

        if (!existingLead) {
          // Ingest raw page content securely via SafeHttpClient
          let rawBody = lead.snippet;
          try {
            const pageRes = await safeFetch(lead.url, {
              method: 'GET',
              timeoutMs: 8000,
              allowedContentTypes: ['text/html', 'application/xhtml+xml', 'text/plain'],
            });
            if (pageRes.statusCode === 200 && pageRes.body) {
              rawBody = pageRes.body.slice(0, 50000); // Truncate to reasonable size
            }
          } catch {
            // Fall back to snippet if page cannot be fetched
          }

          // Content Hash Deduplication
          const contentHash = crypto
            .createHash('sha256')
            .update(`${lead.url}|${lead.title}|${rawBody.slice(0, 500)}`)
            .digest('hex');

          // Check if default source exists for discovery ingest
          let defaultSource = await prisma.source.findFirst({
            where: { connectorType: 'custom_crawler' },
          });

          if (!defaultSource) {
            defaultSource = await prisma.source.create({
              data: {
                name: 'Independent Search Ingestion',
                slug: 'independent-search-ingest',
                url: 'https://edgi.local/discovery',
                connectorType: 'custom_crawler',
                status: 'active',
                capabilities: { canSearch: true, isRealTime: false } as any,
                health: {} as any,
              },
            });
          }

          const existingContent = await prisma.discoveredContent.findUnique({
            where: { contentHash },
          });

          let contentId = existingContent?.id;
          if (!existingContent) {
            const newContent = await prisma.discoveredContent.create({
              data: {
                sourceId: defaultSource.id,
                url: lead.url,
                title: lead.title,
                rawBody,
                contentHash,
                discoveredAt: new Date(),
              },
            });
            contentId = newContent.id;
          }

          // Save Discovered Lead
          await prisma.discoveredLead.create({
            data: {
              runId: discoveryRun.id,
              url: lead.url,
              title: lead.title,
              snippet: lead.snippet,
              domain: lead.domain,
              provider: searchRes.usedProvider,
              query: q.query,
              relevanceScore: (lead.estimatedRelevance || 85) / 100,
              discoveredContentId: contentId,
              status: 'unverified',
            },
          });
          leadsNew++;

          // Extract domain and create candidate source if new
          await createCandidateIfNew(lead.domain, lead.url, q.query);
        }
      }
    } catch (err) {
      console.warn(`[Discovery Worker] Error executing query "${q.query}":`, (err as Error).message);
    }
  }

  const finishedAt = new Date();

  // Finalize discovery run
  await prisma.discoveryRun.update({
    where: { id: discoveryRun.id },
    data: {
      status: 'completed',
      queriesExecuted,
      leadsFound,
      leadsNew,
      costUsd: Number(totalCost.toFixed(4)),
      finishedAt,
    },
  });

  console.log(
    `[Discovery Worker] Completed. Queries: ${queriesExecuted}, Leads found: ${leadsFound}, New: ${leadsNew}, Cost: $${totalCost.toFixed(4)}`
  );

  return {
    success: true,
    runId: discoveryRun.id,
    queriesExecuted,
    leadsFound,
    leadsNew,
    costUsd: totalCost,
  };
}

async function createCandidateIfNew(domain: string, fullUrl: string, query: string) {
  const existingSource = await prisma.source.findFirst({
    where: { OR: [{ url: { contains: domain } }, { url: fullUrl }] },
  });
  if (existingSource) return;

  const existingCandidate = await prisma.sourceCandidate.findFirst({
    where: { OR: [{ url: { contains: domain } }, { url: fullUrl }] },
  });
  if (existingCandidate) return;

  const rootUrl = `https://${domain}`;
  const name = domain.split('.')[0]!;
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);

  await prisma.sourceCandidate.create({
    data: {
      url: rootUrl,
      name: `${capitalized} Opportunities`,
      connectorType: 'website',
      discoveryReason: `Discovered via independent web search query: "${query}"`,
      credibilityScore: 0.85,
      status: 'recommended',
      suggestedSchedule: 'normal',
    },
  });
}

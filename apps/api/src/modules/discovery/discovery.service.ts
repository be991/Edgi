import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  QueryGenerator,
  SearchProviderRegistry,
  BudgetGatekeeper,
  BudgetExceededException,
} from '@edgi/search-providers';

export interface RunDiscoveryDto {
  dryRun?: boolean;
  provider?: string;
  maxQueries?: number;
}

export interface UpdateBudgetDto {
  monthlyTotalBudget?: number;
  searchBudget?: number;
  llmBudget?: number;
  bufferBudget?: number;
  isEmergencyPaused?: boolean;
}

@Injectable()
export class DiscoveryService {
  private queryGenerator = new QueryGenerator();

  constructor(private readonly prisma: PrismaService) {}

  async getQueriesPreview(maxQueries: number = 10) {
    const profile = await this.prisma.userProfile.findFirst();

    const dimensions = {
      degreeLevel: profile?.degree || 'undergraduate',
      fieldOfStudy: profile?.major || 'Cyber Security',
      skills: (profile?.skills as string[]) || ['AppSec', 'fintech security', 'AI agent defense'],
      country: profile?.country || 'Nigeria',
      targetYear: 2026,
    };

    const queries = this.queryGenerator.generateQueries(dimensions, { maxQueries });
    return {
      queries,
      totalCount: queries.length,
      estimatedCostUsd: 0.0, // Mock provider is free, Brave is free tier
    };
  }

  async runDiscovery(dto: RunDiscoveryDto = {}) {
    const { dryRun = false, maxQueries = 10 } = dto;

    // 1. Generate queries from profile
    const preview = await this.getQueriesPreview(maxQueries);
    const queries = preview.queries;

    if (dryRun) {
      return {
        isDryRun: true,
        queries,
        totalCount: queries.length,
        status: 'preview_only',
        message: 'Dry run completed. Queries generated successfully without executing external requests.',
      };
    }

    // 2. Budget Evaluation
    const budgetSettings = await this.getBudgetSettings();
    const currentSearchSpend = await this.getCurrentSearchSpend();

    const budgetStatus = BudgetGatekeeper.evaluateBudget({
      monthlyLimitUsd: budgetSettings.searchBudget,
      currentSpendUsd: currentSearchSpend,
      isEmergencyPaused: budgetSettings.isEmergencyPaused,
    });

    const runStartTime = new Date();

    // 3. If Budget Paused or Hard-Stop reached
    if (budgetStatus.isPaused) {
      const pausedRun = await this.prisma.discoveryRun.create({
        data: {
          provider: dto.provider || 'mock_search',
          status: 'paused_budget',
          queriesExecuted: 0,
          leadsFound: 0,
          leadsNew: 0,
          costUsd: 0.0,
          errorMessage: budgetSettings.isEmergencyPaused
            ? 'Emergency pause is active. Discovery is halted.'
            : `Search budget ceiling reached ($${currentSearchSpend.toFixed(2)} / $${budgetSettings.searchBudget.toFixed(2)}).`,
          querySummary: queries as any,
          startedAt: runStartTime,
          finishedAt: new Date(),
        },
      });

      return {
        runId: pausedRun.id,
        status: 'paused_budget',
        message: pausedRun.errorMessage,
        queriesExecuted: 0,
        leadsFound: 0,
        leadsNew: 0,
      };
    }

    // 4. Create running discovery run record
    const discoveryRun = await this.prisma.discoveryRun.create({
      data: {
        provider: dto.provider || 'mock_search',
        status: 'running',
        querySummary: queries as any,
        startedAt: runStartTime,
      },
    });

    const registry = SearchProviderRegistry.getInstance();
    if (dto.provider) {
      registry.setPrimaryProvider(dto.provider);
    }

    let queriesExecuted = 0;
    let leadsFound = 0;
    let leadsNew = 0;
    let runCost = 0.0;
    const providerUsed = registry.getActiveProvider().name;

    for (const q of queries) {
      // Gatekeeper check: drop low-priority queries if degraded
      if (budgetStatus.thresholdStatus === 'degraded' && q.priority === 'low') {
        continue;
      }

      try {
        const searchResult = await registry.searchWithFailover({ query: q.query, limit: 5 });
        queriesExecuted++;

        // Log call to provider_usage
        const callCost = registry.getActiveProvider().costPerCallUsd;
        runCost += callCost;

        await this.prisma.providerUsage.create({
          data: {
            provider: searchResult.usedProvider,
            operation: 'search',
            units: 1,
            estimatedCost: callCost,
            jobId: discoveryRun.id,
            metadata: { query: q.query, count: searchResult.results.length },
          },
        });

        // Ingest leads
        for (const item of searchResult.results) {
          leadsFound++;

          const existingLead = await this.prisma.discoveredLead.findUnique({
            where: { url: item.url },
          });

          if (!existingLead) {
            await this.prisma.discoveredLead.create({
              data: {
                runId: discoveryRun.id,
                url: item.url,
                title: item.title,
                snippet: item.snippet,
                domain: item.domain,
                provider: searchResult.usedProvider,
                query: q.query,
                relevanceScore: (item.estimatedRelevance || 85) / 100,
                status: 'unverified',
              },
            });
            leadsNew++;

            // Create Candidate Source for unfamiliar publishers
            await this.createCandidateIfUnregistered(item.domain, item.url, q.query);
          }
        }
      } catch (err) {
        console.warn(`Query execution failed for "${q.query}":`, (err as Error).message);
      }
    }

    // Finalize discovery run
    const updatedRun = await this.prisma.discoveryRun.update({
      where: { id: discoveryRun.id },
      data: {
        status: 'completed',
        queriesExecuted,
        leadsFound,
        leadsNew,
        costUsd: Number(runCost.toFixed(4)),
        finishedAt: new Date(),
      },
    });

    return {
      runId: updatedRun.id,
      status: 'completed',
      provider: providerUsed,
      queriesExecuted,
      leadsFound,
      leadsNew,
      costUsd: runCost,
    };
  }

  async getHistory() {
    return this.prisma.discoveryRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
  }

  async getLeads(status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    return this.prisma.discoveredLead.findMany({
      where,
      orderBy: { discoveredAt: 'desc' },
      take: 50,
    });
  }

  async processLead(id: string) {
    return this.prisma.discoveredLead.update({
      where: { id },
      data: { status: 'queued_for_processing', reviewedAt: new Date() },
    });
  }

  async dismissLead(id: string) {
    return this.prisma.discoveredLead.update({
      where: { id },
      data: { status: 'dismissed', reviewedAt: new Date() },
    });
  }

  async addLeadAsSource(id: string) {
    const lead = await this.prisma.discoveredLead.findUnique({ where: { id } });
    if (!lead) throw new BadRequestException(`Lead ${id} not found.`);

    await this.prisma.discoveredLead.update({
      where: { id },
      data: { status: 'converted_source', reviewedAt: new Date() },
    });

    return this.createCandidateIfUnregistered(lead.domain, lead.url, lead.query);
  }

  // Budget & Spend Management
  async getBudgetSettings() {
    let settings = await this.prisma.budgetSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.budgetSetting.create({
        data: {
          monthlyTotalBudget: 10.0,
          searchBudget: 4.0,
          llmBudget: 5.0,
          bufferBudget: 1.0,
          isEmergencyPaused: false,
        },
      });
    }
    return settings;
  }

  async updateBudgetSettings(dto: UpdateBudgetDto) {
    const settings = await this.getBudgetSettings();
    return this.prisma.budgetSetting.update({
      where: { id: settings.id },
      data: {
        monthlyTotalBudget: dto.monthlyTotalBudget ?? settings.monthlyTotalBudget,
        searchBudget: dto.searchBudget ?? settings.searchBudget,
        llmBudget: dto.llmBudget ?? settings.llmBudget,
        bufferBudget: dto.bufferBudget ?? settings.bufferBudget,
        isEmergencyPaused: dto.isEmergencyPaused ?? settings.isEmergencyPaused,
      },
    });
  }

  async getCurrentSearchSpend(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.prisma.providerUsage.aggregate({
      _sum: { estimatedCost: true },
      where: {
        operation: 'search',
        createdAt: { gte: startOfMonth },
      },
    });

    return result._sum.estimatedCost || 0.0;
  }

  async getFullUsageTelemetry() {
    const budget = await this.getBudgetSettings();
    const searchSpent = await this.getCurrentSearchSpend();

    // LLM spend (Phase 4 placeholder)
    const llmSpent = 0.0;
    const totalSpent = searchSpent + llmSpent;

    const budgetStatus = BudgetGatekeeper.evaluateBudget({
      monthlyLimitUsd: budget.searchBudget,
      currentSpendUsd: searchSpent,
      isEmergencyPaused: budget.isEmergencyPaused,
    });

    return {
      month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      totalLimitUsd: budget.monthlyTotalBudget,
      totalSpentUsd: Number(totalSpent.toFixed(2)),
      searchSpentUsd: Number(searchSpent.toFixed(2)),
      searchLimitUsd: budget.searchBudget,
      llmSpentUsd: llmSpent,
      llmLimitUsd: budget.llmBudget,
      bufferRemainingUsd: budget.bufferBudget,
      warningThresholdPercent: 70,
      hardStopThresholdPercent: 100,
      thresholdStatus: budgetStatus.thresholdStatus,
      isPaused: budgetStatus.isPaused,
      isEmergencyPaused: budget.isEmergencyPaused,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async createCandidateIfUnregistered(domain: string, fullUrl: string, query: string) {
    // 1. Check if domain or URL is already in active sources
    const existingSource = await this.prisma.source.findFirst({
      where: {
        OR: [{ url: { contains: domain } }, { url: fullUrl }],
      },
    });

    if (existingSource) return;

    // 2. Check if already in candidate queue
    const existingCandidate = await this.prisma.sourceCandidate.findFirst({
      where: {
        OR: [{ url: { contains: domain } }, { url: fullUrl }],
      },
    });

    if (existingCandidate) return;

    // 3. Create candidate source for user review
    const rootUrl = `https://${domain}`;
    const name = domain.split('.')[0]!;
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    await this.prisma.sourceCandidate.create({
      data: {
        url: rootUrl,
        name: `${capitalizedName} Opportunities`,
        connectorType: 'website',
        discoveryReason: `Discovered via independent web search query: "${query}"`,
        credibilityScore: 0.85,
        status: 'recommended',
        suggestedSchedule: 'normal',
      },
    });
  }
}

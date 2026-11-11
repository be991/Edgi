import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface BudgetStatus {
  month: string;
  totalLimitUsd: number;
  totalSpentUsd: number;
  searchLimitUsd: number;
  searchSpentUsd: number;
  llmLimitUsd: number;
  llmSpentUsd: number;
  bufferRemainingUsd: number;
  isEmergencyPaused: boolean;
  isHardStopActive: boolean;
  costPerVerifiedOpportunityUsd: number;
  lowYieldSources: Array<{
    sourceId: string;
    sourceName: string;
    totalCost: number;
    leadsFound: number;
    recommendation: string;
  }>;
}

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly TOTAL_CAP = 10.0;
  private readonly SEARCH_CAP = 4.0;
  private readonly LLM_CAP = 5.0;
  private readonly BUFFER_CAP = 1.0;

  /**
   * Records billable external API usage into ProviderUsage table.
   */
  async recordUsage(params: {
    provider: string; // brave_search, serper, gemini, openai, resend
    operation: string; // search, llm_extract, email_send
    units?: number;
    estimatedCost: number;
    jobId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.providerUsage.create({
      data: {
        provider: params.provider,
        operation: params.operation,
        units: params.units || 1,
        estimatedCost: params.estimatedCost,
        jobId: params.jobId || null,
        metadata: params.metadata || {},
      },
    });
  }

  /**
   * Retrieves current monthly expenditure and cost telemetry.
   */
  async getBudgetStatus(): Promise<BudgetStatus> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Query all usage records for the current calendar month
    const usages = await this.prisma.providerUsage.findMany({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    let totalSpent = 0;
    let searchSpent = 0;
    let llmSpent = 0;

    for (const u of usages) {
      totalSpent += u.estimatedCost;
      if (u.operation.includes('search')) {
        searchSpent += u.estimatedCost;
      } else if (u.operation.includes('llm') || u.operation.includes('extract') || u.operation.includes('draft')) {
        llmSpent += u.estimatedCost;
      }
    }

    // Check emergency pause setting from BudgetSetting
    const setting = await this.prisma.budgetSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    const isEmergencyPaused = setting ? setting.isEmergencyPaused : false;
    const isHardStopActive = isEmergencyPaused || totalSpent >= this.TOTAL_CAP;

    // Calculate Cost Per Verified Opportunity
    const verifiedOppsCount = await this.prisma.opportunity.count({
      where: {
        verificationStatus: 'verified',
        createdAt: { gte: startOfMonth },
      },
    });

    const costPerVerifiedOpportunityUsd =
      verifiedOppsCount > 0 ? Number((totalSpent / verifiedOppsCount).toFixed(3)) : totalSpent;

    // Evaluate low-yield sources
    const sources = await this.prisma.source.findMany({
      where: { status: 'active' },
      take: 10,
    });

    const lowYieldSources = sources
      .filter((s: any) => {
        const items = s.health?.totalItemsDiscovered || 0;
        const failures = s.health?.consecutiveFailures || 0;
        return failures >= 3 || (items === 0 && s.status === 'active');
      })
      .map((s) => ({
        sourceId: s.id,
        sourceName: s.name,
        totalCost: 0.45,
        leadsFound: (s.health as any)?.totalItemsDiscovered || 0,
        recommendation: 'Pause source to save search quota (high failure rate or zero yielded opportunities)',
      }));

    return {
      month: monthStr,
      totalLimitUsd: this.TOTAL_CAP,
      totalSpentUsd: Number(totalSpent.toFixed(3)),
      searchLimitUsd: this.SEARCH_CAP,
      searchSpentUsd: Number(searchSpent.toFixed(3)),
      llmLimitUsd: this.LLM_CAP,
      llmSpentUsd: Number(llmSpent.toFixed(3)),
      bufferRemainingUsd: Number(Math.max(0, this.TOTAL_CAP - totalSpent).toFixed(3)),
      isEmergencyPaused,
      isHardStopActive,
      costPerVerifiedOpportunityUsd,
      lowYieldSources,
    };
  }

  /**
   * Enforces the hard stop. Throws HTTP 402 if budget exceeded or paused.
   */
  async checkBudgetOrThrow(operationType: 'search' | 'llm' | 'email') {
    const status = await this.getBudgetStatus();

    if (status.isEmergencyPaused) {
      throw new HttpException(
        'Emergency Pause is currently ACTIVE. All billable external queries are paused.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (status.totalSpentUsd >= status.totalLimitUsd) {
      throw new HttpException(
        `Monthly budget cap of $${status.totalLimitUsd.toFixed(2)} reached. Billable call for '${operationType}' blocked by hard stop.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (operationType === 'search' && status.searchSpentUsd >= status.searchLimitUsd) {
      throw new HttpException(
        `Search budget cap of $${status.searchLimitUsd.toFixed(2)} reached. Further search calls blocked.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (operationType === 'llm' && status.llmSpentUsd >= status.llmLimitUsd) {
      throw new HttpException(
        `LLM budget cap of $${status.llmLimitUsd.toFixed(2)} reached. Further LLM inference calls blocked.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  /**
   * Toggles emergency pause.
   */
  async setEmergencyPause(isPaused: boolean, userId?: string) {
    let setting = await this.prisma.budgetSetting.findFirst();
    if (setting) {
      await this.prisma.budgetSetting.update({
        where: { id: setting.id },
        data: { isEmergencyPaused: isPaused, updatedAt: new Date() },
      });
    } else {
      await this.prisma.budgetSetting.create({
        data: {
          isEmergencyPaused: isPaused,
          monthlyTotalBudget: this.TOTAL_CAP,
          searchBudget: this.SEARCH_CAP,
          llmBudget: this.LLM_CAP,
          bufferBudget: this.BUFFER_CAP,
        },
      });
    }

    // Record in AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: isPaused ? 'BUDGET_EMERGENCY_PAUSE_ENABLED' : 'BUDGET_EMERGENCY_PAUSE_DISABLED',
        entityType: 'BudgetSetting',
        entityId: 'global',
        diff: { isEmergencyPaused: isPaused },
      },
    });

    return { success: true, isEmergencyPaused: isPaused };
  }
}

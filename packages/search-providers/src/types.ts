export interface SearchInput {
  query: string;
  limit?: number;
  country?: string;
  timeWindow?: 'day' | 'week' | 'month' | 'year';
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  publishedDate?: string;
  domain: string;
  estimatedRelevance?: number;
}

export interface ProviderUsage {
  requestsToday: number;
  requestsThisMonth: number;
  totalCostUsd: number;
}

export interface ProviderHealth {
  isAvailable: boolean;
  latencyMs?: number;
  errorMessage?: string;
}

export interface SearchProvider {
  readonly name: string;
  readonly costPerCallUsd: number;
  search(input: SearchInput): Promise<SearchResult[]>;
  getUsage(): Promise<ProviderUsage>;
  checkAvailability(): Promise<ProviderHealth>;
}

export type BudgetThresholdStatus = 'normal' | 'warning' | 'degraded' | 'hard_stop';

export interface BudgetStatus {
  monthlyLimitUsd: number;
  currentSpendUsd: number;
  percentUsed: number;
  thresholdStatus: BudgetThresholdStatus;
  isPaused: boolean;
  canExecuteHighPriority: boolean;
  canExecuteLowPriority: boolean;
}

export interface GeneratedQuery {
  query: string;
  category: string;
  dimension: string;
  priority: 'high' | 'normal' | 'low';
  hash: string;
}

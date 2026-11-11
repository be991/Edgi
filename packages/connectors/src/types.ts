export interface SourceCapabilities {
  canSearch: boolean;
  canPaginate: boolean;
  rateLimitPerMin: number;
  requiresAuth: boolean;
  isRealTime: boolean;
  notes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface DiscoveryInput {
  url: string;
  config?: Record<string, unknown>;
  since?: Date;
  limit?: number;
}

export interface DiscoveredItem {
  url: string;
  title: string;
  rawBody: string;
  cleanedBody?: string;
  publishedAt?: Date;
  author?: string;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryResult {
  items: DiscoveredItem[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SourceContent {
  url: string;
  title: string;
  rawBody: string;
  cleanedBody?: string;
  publishedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SourceHealth {
  isHealthy: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
}

export interface SourceEvaluationResult {
  url: string;
  detectedType:
    | 'website'
    | 'rss_feed'
    | 'github'
    | 'youtube'
    | 'reddit'
    | 'telegram'
    | 'discord'
    | 'x_twitter'
    | 'instagram'
    | 'linkedin'
    | 'manual_capture';
  proposedMethod: string;
  name: string;
  capabilities: SourceCapabilities;
  restrictions?: string[];
  suggestedSchedule: 'high_value' | 'normal' | 'low_value' | 'weekly';
  sampleItems?: Array<{ title: string; url: string }>;
}

export interface SourceConnector {
  readonly provider: string;
  validateConfiguration(config: Record<string, unknown>): Promise<ValidationResult>;
  getCapabilities(): Promise<SourceCapabilities>;
  discover(input: DiscoveryInput): Promise<DiscoveryResult>;
  fetchContent(reference: string): Promise<SourceContent>;
  checkHealth(config: Record<string, unknown>): Promise<SourceHealth>;
}

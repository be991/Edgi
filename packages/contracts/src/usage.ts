import { z } from 'zod';

export const UsageBudgetSchema = z.object({
  month: z.string(), // e.g. "2026-11"
  totalLimitUsd: z.number().default(10),
  totalSpentUsd: z.number().default(0),
  searchSpentUsd: z.number().default(0),
  searchLimitUsd: z.number().default(4),
  llmSpentUsd: z.number().default(0),
  llmLimitUsd: z.number().default(5),
  bufferRemainingUsd: z.number().default(1),
  warningThresholdPercent: z.number().default(70),
  hardStopThresholdPercent: z.number().default(100),
  isHardStopActive: z.boolean().default(false),
  lastUpdated: z.string().datetime(),
});
export type UsageBudget = z.infer<typeof UsageBudgetSchema>;

export const SystemHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'failing']),
  timestamp: z.string().datetime(),
  version: z.string(),
  database: z.object({
    status: z.enum(['connected', 'disconnected']),
    latencyMs: z.number().nullable(),
  }),
  redis: z.object({
    status: z.enum(['connected', 'disconnected']),
    latencyMs: z.number().nullable(),
  }),
  workers: z.object({
    activeCount: z.number(),
    queuedCount: z.number(),
    failedCount: z.number(),
    lastHeartbeat: z.string().datetime().nullable(),
  }),
  budget: UsageBudgetSchema,
});
export type SystemHealth = z.infer<typeof SystemHealthSchema>;

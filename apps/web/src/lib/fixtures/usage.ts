import { UsageBudget, SystemHealth } from '@edgi/contracts';

export const mockUsageBudget: UsageBudget = {
  month: '2026-11',
  totalLimitUsd: 10.0,
  totalSpentUsd: 3.45,
  searchSpentUsd: 1.2,
  searchLimitUsd: 4.0,
  llmSpentUsd: 2.25,
  llmLimitUsd: 5.0,
  bufferRemainingUsd: 1.0,
  warningThresholdPercent: 70,
  hardStopThresholdPercent: 100,
  isHardStopActive: false,
  lastUpdated: '2026-11-09T23:00:00.000Z',
};

export const mockSystemHealth: SystemHealth = {
  status: 'healthy',
  timestamp: '2026-11-09T23:30:00.000Z',
  version: '0.1.0-alpha',
  database: {
    status: 'connected',
    latencyMs: 12,
  },
  redis: {
    status: 'connected',
    latencyMs: 3,
  },
  workers: {
    activeCount: 1,
    queuedCount: 0,
    failedCount: 0,
    lastHeartbeat: '2026-11-09T23:29:45.000Z',
  },
  budget: mockUsageBudget,
};

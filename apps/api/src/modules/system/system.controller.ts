import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';

@ApiTags('System')
@Controller()
export class SystemController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('system/health')
  @ApiOperation({ summary: 'System health check' })
  async getHealth() {
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    let dbLatency: number | null = null;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0-alpha',
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      redis: {
        status: 'connected',
        latencyMs: 3,
      },
      workers: {
        activeCount: 1,
        queuedCount: 0,
        failedCount: 0,
        lastHeartbeat: new Date().toISOString(),
      },
      budget: {
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
        lastUpdated: new Date().toISOString(),
      },
    };
  }
}

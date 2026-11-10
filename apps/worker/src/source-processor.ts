import * as crypto from 'crypto';
import { Job } from 'bullmq';
import { prisma } from '@edgi/database';
import { ConnectorRegistry } from '@edgi/connectors';

export interface SourceCheckJobData {
  sourceId: string;
  triggeredBy?: 'scheduler' | 'manual';
}

export async function processSourceCheckJob(job: Job<SourceCheckJobData>) {
  const { sourceId, triggeredBy = 'scheduler' } = job.data;
  const startedAt = new Date();

  console.log(`[Source Worker] Starting check for Source ID: ${sourceId} (Trigger: ${triggeredBy})...`);

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    console.warn(`[Source Worker] Source ${sourceId} not found. Skipping.`);
    return { skipped: true, reason: 'Source not found' };
  }

  const registry = ConnectorRegistry.getInstance();
  const connector = registry.get(source.connectorType);

  // 1. Execute Health Check
  let healthResult;
  try {
    healthResult = await connector.checkHealth({
      url: source.url,
      ...(source.config as Record<string, unknown>),
    });
  } catch (err: unknown) {
    healthResult = {
      isHealthy: false,
      statusCode: 500,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  // Record Health Check in Database
  await prisma.sourceHealthCheck.create({
    data: {
      sourceId: source.id,
      status: healthResult.isHealthy ? 'healthy' : 'unreachable',
      statusCode: healthResult.statusCode || (healthResult.isHealthy ? 200 : 500),
      responseTimeMs: healthResult.responseTimeMs || 0,
      errorMessage: healthResult.errorMessage || null,
      checkedAt: startedAt,
    },
  });

  // 2. If Unhealthy -> Isolate failure, increment consecutive errors, NEVER update lastSuccessfulCheck
  if (!healthResult.isHealthy) {
    const consecutiveFailures = source.consecutiveFailures + 1;
    const newStatus = consecutiveFailures >= 3 ? 'unavailable' : source.status;

    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastCheckedAt: startedAt,
        consecutiveFailures,
        lastErrorMessage: healthResult.errorMessage || 'Check failed',
        status: newStatus,
      },
    });

    await prisma.collectionRun.create({
      data: {
        sourceId: source.id,
        jobId: String(job.id || 'job-' + Date.now()),
        status: 'failed',
        itemsFound: 0,
        itemsNew: 0,
        errorMessage: healthResult.errorMessage || 'Health check failed',
        startedAt,
        finishedAt: new Date(),
      },
    });

    if (consecutiveFailures >= 3) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        await prisma.notification.create({
          data: {
            userId: defaultUser.id,
            type: 'source_issue',
            title: `Source Issue Detected: ${source.name}`,
            message: `Source "${source.name}" has failed 3 consecutive health checks: ${healthResult.errorMessage}`,
            link: '/sources',
          },
        });
      }
    }

    return {
      success: false,
      sourceId: source.id,
      error: healthResult.errorMessage,
    };
  }

  // 3. If Healthy -> Discover content & deduplicate with SHA-256 content hashes
  let discoveryResult;
  try {
    discoveryResult = await connector.discover({
      url: source.url,
      config: source.config as Record<string, unknown>,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.collectionRun.create({
      data: {
        sourceId: source.id,
        jobId: String(job.id || 'job-' + Date.now()),
        status: 'failed',
        itemsFound: 0,
        itemsNew: 0,
        errorMessage: `Discovery failed: ${errorMsg}`,
        startedAt,
        finishedAt: new Date(),
      },
    });
    return { success: false, error: errorMsg };
  }

  let itemsNew = 0;
  for (const item of discoveryResult.items) {
    const hashContent = `${item.url}|${item.title}|${item.rawBody.trim()}`;
    const contentHash = crypto.createHash('sha256').update(hashContent).digest('hex');

    const existing = await prisma.discoveredContent.findUnique({
      where: { contentHash },
    });

    if (!existing) {
      await prisma.discoveredContent.create({
        data: {
          sourceId: source.id,
          url: item.url,
          title: item.title,
          rawBody: item.rawBody,
          cleanedBody: item.cleanedBody || null,
          contentHash,
          discoveredAt: item.publishedAt || new Date(),
        },
      });
      itemsNew++;
    }
  }

  const finishedAt = new Date();

  // Record Collection Run
  await prisma.collectionRun.create({
    data: {
      sourceId: source.id,
      jobId: String(job.id || 'job-' + Date.now()),
      status: 'completed',
      itemsFound: discoveryResult.items.length,
      itemsNew,
      startedAt,
      finishedAt,
    },
  });

  // Calculate Next Check Interval
  const intervalMinutes = getIntervalMinutes(source.checkInterval);
  const nextCheckAt = new Date(finishedAt.getTime() + intervalMinutes * 60 * 1000);

  // Update Source: reset errors and set successful check
  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastCheckedAt: finishedAt,
      lastSuccessfulCheck: finishedAt,
      nextCheckAt,
      consecutiveFailures: 0,
      lastErrorMessage: null,
      status: 'active',
      health: {
        lastSuccessfulCheck: finishedAt.toISOString(),
        nextCheck: nextCheckAt.toISOString(),
        lastError: null,
        consecutiveFailures: 0,
        latencyMs: healthResult.responseTimeMs,
      },
    },
  });

  console.log(
    `[Source Worker] Source "${source.name}" check completed. Discovered: ${discoveryResult.items.length}, New: ${itemsNew}`
  );

  return {
    success: true,
    sourceId: source.id,
    itemsFound: discoveryResult.items.length,
    itemsNew,
  };
}

function getIntervalMinutes(intervalName: string): number {
  switch (intervalName) {
    case 'high_value':
      return 60; // 1 hour
    case 'normal':
      return 360; // 6 hours
    case 'low_value':
      return 1440; // 24 hours
    case 'weekly':
      return 10080; // 7 days
    default:
      return 360;
  }
}

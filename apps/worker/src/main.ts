import * as fs from 'fs';
import * as path from 'path';

// Load environment files before any module initialization
const envCandidates = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
    try {
      (process as any).loadEnvFile(envPath);
    } catch {}
  }
}

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@edgi/database';
import { processSourceCheckJob, SourceCheckJobData } from './source-processor';
import { processDiscoveryJob, DiscoveryJobData } from './discovery-processor';
import { processContentJob, ContentProcessingJobData, runReverificationSweep } from './content-processor';
import { processMatchJob, MatchJobData } from './match-processor';
import {
  processNotificationJob,
  NotificationJobData,
  runDeadlineReminderSweep,
  runDailyDigestSweep,
} from './notification-processor';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

async function bootstrap() {
  console.log(`🔌 Worker connecting to Redis at ${redisHost}:${redisPort}...`);

  try {
    await redisConnection.connect();
    console.log('✅ Worker connected to Redis successfully.');
  } catch (err) {
    console.warn('⚠️ Redis not yet available. Retrying connection in background...');
  }

  // 1. Heartbeat Queue
  const heartbeatQueueName = 'heartbeat-queue';
  const heartbeatQueue = new Queue(heartbeatQueueName, {
    connection: redisConnection,
  });

  try {
    await heartbeatQueue.add(
      'system-heartbeat',
      { initiatedAt: new Date().toISOString(), pid: process.pid },
      {
        repeat: { every: 60000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    console.log('⏱️ Repeatable heartbeat job scheduled.');
  } catch (e) {
    console.warn('Could not schedule heartbeat job:', (e as Error).message);
  }

  const heartbeatWorker = new Worker(
    heartbeatQueueName,
    async (job: Job) => {
      const startedAt = new Date();
      try {
        await prisma.processingJob.create({
          data: {
            queueName: heartbeatQueueName,
            jobId: String(job.id || 'hb-' + Date.now()),
            jobType: 'heartbeat',
            payload: { timestamp: startedAt.toISOString(), pid: process.pid },
            status: 'completed',
            attempts: job.attemptsMade + 1,
            startedAt,
            finishedAt: new Date(),
          },
        });
      } catch {}
      return { status: 'healthy', timestamp: new Date().toISOString() };
    },
    { connection: redisConnection, concurrency: 2 }
  );

  // 2. Source Polling Queue
  const sourceQueueName = 'source-polling-queue';
  const sourceQueue = new Queue<SourceCheckJobData>(sourceQueueName, {
    connection: redisConnection,
  });

  const sourceWorker = new Worker<SourceCheckJobData>(
    sourceQueueName,
    async (job: Job<SourceCheckJobData>) => {
      return processSourceCheckJob(job);
    },
    {
      connection: redisConnection,
      concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    }
  );

  sourceWorker.on('completed', (job) => {
    console.log(`✨ Source check job #${job.id} for source ${job.data.sourceId} finished.`);
  });

  sourceWorker.on('failed', (job, err) => {
    console.error(`❌ Source check job #${job?.id} failed:`, err.message);
  });

  // 3. Discovery Execution Queue
  const discoveryQueueName = 'discovery-queue';
  const discoveryQueue = new Queue<DiscoveryJobData>(discoveryQueueName, {
    connection: redisConnection,
  });

  const discoveryWorker = new Worker<DiscoveryJobData>(
    discoveryQueueName,
    async (job: Job<DiscoveryJobData>) => {
      return processDiscoveryJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  discoveryWorker.on('completed', (job) => {
    console.log(`✨ Discovery job #${job.id} (run: ${job.data.runId}) finished.`);
  });

  discoveryWorker.on('failed', (job, err) => {
    console.error(`❌ Discovery job #${job?.id} failed:`, err.message);
  });

  // 4. Content Processing Queue (Phase 4 Pipeline)
  const processingQueueName = 'content-processing-queue';
  const processingQueue = new Queue<ContentProcessingJobData>(processingQueueName, {
    connection: redisConnection,
  });

  const processingWorker = new Worker<ContentProcessingJobData>(
    processingQueueName,
    async (job: Job<ContentProcessingJobData>) => {
      return processContentJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  processingWorker.on('completed', (job) => {
    console.log(`✨ Content processing job #${job.id} (content: ${job.data.discoveredContentId}) finished.`);
  });

  processingWorker.on('failed', (job, err) => {
    console.error(`❌ Content processing job #${job?.id} failed:`, err.message);
  });

  // 5. Personal Intelligence Match Calculation Queue (Phase 5)
  const matchQueueName = 'match-calculation-queue';
  const matchQueue = new Queue<MatchJobData>(matchQueueName, {
    connection: redisConnection,
  });

  const matchWorker = new Worker<MatchJobData>(
    matchQueueName,
    async (job: Job<MatchJobData>) => {
      return processMatchJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  matchWorker.on('completed', (job) => {
    console.log(`✨ Match assessment job #${job.id} completed.`);
  });

  matchWorker.on('failed', (job, err) => {
    console.error(`❌ Match assessment job #${job?.id} failed:`, err.message);
  });

  // 6. Notification Dispatch & Reminder Queue (Phase 7)
  const notificationQueueName = 'notification-queue';
  const notificationQueue = new Queue<NotificationJobData>(notificationQueueName, {
    connection: redisConnection,
  });

  const notificationWorker = new Worker<NotificationJobData>(
    notificationQueueName,
    async (job: Job<NotificationJobData>) => {
      return processNotificationJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  notificationWorker.on('completed', (job) => {
    console.log(`✨ Notification job #${job.id} (${job.data.jobType}) completed.`);
  });

  notificationWorker.on('failed', (job, err) => {
    console.error(`❌ Notification job #${job?.id} failed:`, err.message);
  });

  // 7. Scheduler: checks for due sources every 60 seconds
  const scheduleSourceChecks = async () => {
    try {
      const now = new Date();
      const dueSources = await prisma.source.findMany({
        where: {
          status: { in: ['active', 'active_limited'] },
          OR: [
            { nextCheckAt: null },
            { nextCheckAt: { lte: now } },
          ],
        },
        take: 10,
      });

      for (const source of dueSources) {
        await sourceQueue.add(
          `check-${source.id}`,
          { sourceId: source.id, triggeredBy: 'scheduler' },
          {
            jobId: `poll-${source.id}-${Math.floor(now.getTime() / 60000)}`,
            removeOnComplete: 50,
            removeOnFail: 20,
          }
        );
      }
    } catch (err) {
      // Database might be booting or busy
    }
  };

  const schedulerInterval = setInterval(scheduleSourceChecks, 60000);
  // Run an initial sweep after 5 seconds
  setTimeout(scheduleSourceChecks, 5000);

  // 8. Re-verification Loop: checks active opportunities for expirations every 1 hour
  const reverificationInterval = setInterval(runReverificationSweep, 3600000);
  setTimeout(runReverificationSweep, 10000);

  // 9. Verified Deadline Reminder Sweeper (Every 4 hours)
  const reminderInterval = setInterval(runDeadlineReminderSweep, 4 * 3600000);
  setTimeout(runDeadlineReminderSweep, 15000);

  // 10. Daily Digest Sweeper (Every 1 hour, triggers if time matches digest schedule)
  const digestInterval = setInterval(runDailyDigestSweep, 3600000);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('🛑 Shutting down workers gracefully...');
    clearInterval(schedulerInterval);
    clearInterval(reverificationInterval);
    clearInterval(reminderInterval);
    clearInterval(digestInterval);
    await heartbeatWorker.close();
    await sourceWorker.close();
    await discoveryWorker.close();
    await processingWorker.close();
    await matchWorker.close();
    await notificationWorker.close();
    await heartbeatQueue.close();
    await sourceQueue.close();
    await discoveryQueue.close();
    await processingQueue.close();
    await matchQueue.close();
    await notificationQueue.close();
    redisConnection.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('🚀 Edgi Background Worker & Source Polling Scheduler initialized.');
}

bootstrap().catch((err) => {
  console.error('Fatal worker initialization error:', err);
});

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@edgi/database';

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

  const queueName = 'heartbeat-queue';

  // Create Queue
  const heartbeatQueue = new Queue(queueName, {
    connection: redisConnection,
  });

  // Schedule repeatable heartbeat job (every 60s) with 3 retries & exponential backoff
  try {
    await heartbeatQueue.add(
      'system-heartbeat',
      { initiatedAt: new Date().toISOString(), pid: process.pid },
      {
        repeat: {
          every: 60000,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    console.log('⏱️ Repeatable heartbeat job scheduled (every 60s with exponential backoff).');
  } catch (e) {
    console.warn('Could not schedule repeatable job immediately (Redis may be offline):', (e as Error).message);
  }

  // Create Worker Processor
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const startedAt = new Date();
      console.log(`[Worker] Processing Heartbeat Job #${job.id} (attempt ${job.attemptsMade + 1})...`);

      // Write execution record to processing_jobs table to prove persistence loop
      try {
        await prisma.processingJob.create({
          data: {
            queueName,
            jobId: String(job.id || 'hb-' + Date.now()),
            jobType: 'heartbeat',
            payload: {
              timestamp: startedAt.toISOString(),
              workerPid: process.pid,
              data: job.data,
            },
            status: 'completed',
            attempts: job.attemptsMade + 1,
            startedAt,
            finishedAt: new Date(),
          },
        });
        console.log(`[Worker Heartbeat] Pulse processed and persisted to DB (Job ID: ${job.id})`);
      } catch (dbErr) {
        console.warn('[Worker] Could not write heartbeat to DB (DB may be offline):', (dbErr as Error).message);
      }

      return { status: 'healthy', timestamp: new Date().toISOString() };
    },
    {
      connection: redisConnection,
      concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    },
  );

  worker.on('completed', (job) => {
    console.log(`✨ Heartbeat job #${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Heartbeat job #${job?.id} failed:`, err.message);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('🛑 Shutting down worker gracefully...');
    await worker.close();
    await heartbeatQueue.close();
    redisConnection.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('🚀 Edgi Background Worker initialized and listening for jobs.');
}

bootstrap().catch((err) => {
  console.error('Fatal worker initialization error:', err);
});

import { z } from 'zod';

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_MODE: z.enum(['mock', 'live']).default('mock'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001/api/v1'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().min(16).default('super-secret-jwt-key-for-local-dev-at-least-32-chars'),
  DEFAULT_TIMEZONE: z.string().default('Africa/Lagos'),
  MONTHLY_BUDGET_USD: z.coerce.number().default(10),
  SEARCH_BUDGET_USD: z.coerce.number().default(4),
  LLM_BUDGET_USD: z.coerce.number().default(5),
  BUFFER_BUDGET_USD: z.coerce.number().default(1),
  SENTRY_DSN: z.string().optional(),
});

export const workerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  WORKER_CONCURRENCY: z.coerce.number().default(5),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function validateEnv<T extends z.ZodTypeAny>(schema: T, env: Record<string, unknown> = process.env): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ Invalid environment variables configuration:', JSON.stringify(formatted, null, 2));
    throw new Error('Environment configuration validation failed.');
  }
  return result.data;
}

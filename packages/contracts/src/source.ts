import { z } from 'zod';
import { ConnectorStatusSchema, ConnectorTypeSchema } from './enums';

export const SourceCapabilitiesSchema = z.object({
  canSearch: z.boolean().default(false),
  canPaginate: z.boolean().default(false),
  rateLimitPerMin: z.number().default(30),
  requiresAuth: z.boolean().default(false),
  isRealTime: z.boolean().default(false),
  notes: z.string().optional(),
});
export type SourceCapabilities = z.infer<typeof SourceCapabilitiesSchema>;

export const SourceHealthSchema = z.object({
  lastSuccessfulCheck: z.string().datetime().nullable(),
  nextCheck: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  consecutiveFailures: z.number().default(0),
  latencyMs: z.number().nullable(),
  totalItemsDiscovered: z.number().default(0),
});
export type SourceHealth = z.infer<typeof SourceHealthSchema>;

export const SourceSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().nullable().optional(),
  organizationName: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  connectorType: ConnectorTypeSchema,
  url: z.string().url(),
  status: ConnectorStatusSchema,
  capabilities: SourceCapabilitiesSchema,
  health: SourceHealthSchema,
  config: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const CandidateSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  url: z.string().url(),
  connectorType: ConnectorTypeSchema,
  reasoning: z.string(),
  status: z.enum(['pending', 'approved', 'ignored', 'blocked']),
  discoveredAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
});
export type CandidateSource = z.infer<typeof CandidateSourceSchema>;

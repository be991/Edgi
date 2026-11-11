import { z } from 'zod';
import { ConnectorTypeSchema } from './enums';

export const CaptureSubmissionSchema = z.object({
  url: z.string().url().optional().or(z.literal('')),
  caption: z.string().optional().default(''),
  platform: ConnectorTypeSchema.default('website'),
  mediaBase64: z.string().optional(),
  mediaMimeType: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type CaptureSubmission = z.infer<typeof CaptureSubmissionSchema>;

export const CaptureResultSchema = z.object({
  id: z.string(),
  status: z.enum(['queued', 'extracted', 'duplicate', 'needs_review']),
  opportunityId: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  title: z.string().optional(),
  organization: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  isDuplicate: z.boolean().default(false),
  evidenceCount: z.number().default(1),
  message: z.string(),
  extractedData: z.record(z.unknown()).optional(),
});
export type CaptureResult = z.infer<typeof CaptureResultSchema>;

export const SocialPlatformSummarySchema = z.object({
  platform: ConnectorTypeSchema,
  name: z.string(),
  status: z.enum(['active', 'active_limited', 'authorization_required', 'manual_capture_only', 'unavailable']),
  capabilitiesDescription: z.string(),
  restrictions: z.array(z.string()),
  credentialConfigured: z.boolean(),
  lastCheck: z.string().nullable().optional(),
  discoveredCount: z.number().default(0),
  rateLimitPerMin: z.number(),
  authType: z.string(),
});
export type SocialPlatformSummary = z.infer<typeof SocialPlatformSummarySchema>;

import { z } from 'zod';

export const ContentEvidenceSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  sourceId: z.string().uuid(),
  sourceName: z.string(),
  sourceUrl: z.string().url(),
  fieldName: z.string(), // e.g. 'deadline', 'eligibility', 'stipend', 'apply_url'
  extractedValue: z.string(),
  confidence: z.number().min(0).max(1),
  snippet: z.string(),
  extractedAt: z.string().datetime(),
});
export type ContentEvidence = z.infer<typeof ContentEvidenceSchema>;

export const DiscoveredContentSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  contentHash: z.string(),
  url: z.string().url(),
  title: z.string(),
  rawBody: z.string(),
  cleanedBody: z.string().optional(),
  discoveredAt: z.string().datetime(),
});
export type DiscoveredContent = z.infer<typeof DiscoveredContentSchema>;

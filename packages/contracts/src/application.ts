import { z } from 'zod';
import { ApplicationStatusSchema } from './enums';

export const ApplicationChecklistItemSchema = z.object({
  id: z.string().uuid(),
  task: z.string().min(1),
  completed: z.boolean().default(false),
});
export type ApplicationChecklistItem = z.infer<typeof ApplicationChecklistItemSchema>;

export const ApplicationStatusHistoryItemSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  fromStatus: ApplicationStatusSchema,
  toStatus: ApplicationStatusSchema,
  note: z.string().nullable().optional(),
  changedAt: z.string().datetime(),
});
export type ApplicationStatusHistoryItem = z.infer<typeof ApplicationStatusHistoryItemSchema>;

export const ApplicationDocumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  fileUrl: z.string().url(),
  type: z.enum(['cv', 'cover_letter', 'transcript', 'portfolio', 'essay', 'recommendation', 'certificate', 'other']),
  uploadedAt: z.string().datetime(),
});
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;

export const UserDocumentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string(),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string(),
  type: z.enum(['cv', 'cover_letter', 'transcript', 'portfolio', 'essay', 'recommendation', 'certificate', 'other']),
  version: z.number().int().default(1),
  checksum: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type UserDocument = z.infer<typeof UserDocumentSchema>;

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  opportunityTitle: z.string(),
  organizationName: z.string(),
  opportunityCategory: z.string().optional(),
  opportunityStatus: z.string().optional(), // 'open' | 'expired' | 'closed'
  userId: z.string().uuid(),
  status: ApplicationStatusSchema,
  appliedAt: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable(),
  followUpDate: z.string().datetime().nullable().optional(),
  notes: z.string().default(''),
  checklist: z.array(ApplicationChecklistItemSchema).default([]),
  documents: z.array(ApplicationDocumentSchema).default([]),
  statusHistory: z.array(ApplicationStatusHistoryItemSchema).default([]),
  draftAnswers: z.record(z.string()).default({}),
  interviewInfo: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const UpdateApplicationSchema = ApplicationSchema.partial().omit({
  id: true,
  opportunityId: true,
  userId: true,
  createdAt: true,
});
export type UpdateApplication = z.infer<typeof UpdateApplicationSchema>;

export const AiDraftRequestSchema = z.object({
  applicationId: z.string().uuid(),
  promptType: z.enum(['tailor_cv_bullets', 'draft_motivation', 'explain_requirements', 'missing_documents']),
  targetRole: z.string().optional(),
  specificQuestions: z.array(z.string()).optional(),
});
export type AiDraftRequest = z.infer<typeof AiDraftRequestSchema>;

export const AiDraftResponseSchema = z.object({
  draftType: z.string(),
  content: z.string(),
  usedProfileFacts: z.array(z.string()),
  missingQualifications: z.array(z.string()).default([]),
  disclaimer: z.string().default('[AI DRAFT — Requires Your Review & Approval. Verify all statements before submitting. No auto-submit capability exists.]'),
  generatedAt: z.string().datetime(),
});
export type AiDraftResponse = z.infer<typeof AiDraftResponseSchema>;

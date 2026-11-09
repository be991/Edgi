import { z } from 'zod';
import { ApplicationStatusSchema } from './enums';

export const ApplicationChecklistItemSchema = z.object({
  id: z.string().uuid(),
  task: z.string().min(1),
  completed: z.boolean().default(false),
});
export type ApplicationChecklistItem = z.infer<typeof ApplicationChecklistItemSchema>;

export const ApplicationDocumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  fileUrl: z.string().url(),
  type: z.enum(['cv', 'cover_letter', 'transcript', 'portfolio', 'essay', 'recommendation', 'other']),
  uploadedAt: z.string().datetime(),
});
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  opportunityTitle: z.string(),
  organizationName: z.string(),
  opportunityCategory: z.string().optional(),
  userId: z.string().uuid(),
  status: ApplicationStatusSchema,
  appliedAt: z.string().datetime().nullable(),
  deadline: z.string().datetime().nullable(),
  followUpDate: z.string().datetime().nullable(),
  notes: z.string().default(''),
  checklist: z.array(ApplicationChecklistItemSchema).default([]),
  documents: z.array(ApplicationDocumentSchema).default([]),
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

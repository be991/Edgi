import { z } from 'zod';
import {
  OpportunityCategorySchema,
  VerificationStatusSchema,
  EligibilityStatusSchema,
  ApplicationStatusSchema,
} from './enums';
import { OrganizationSchema } from './organization';
import { ContentEvidenceSchema } from './content';
import { EligibilityAssessmentSchema, RelevanceBreakdownSchema } from './intelligence';

export const LocationSchema = z.object({
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  isRemote: z.boolean().default(false),
  remoteRegions: z.array(z.string()).default([]).optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const StipendSchema = z.object({
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
  currency: z.string().default('USD'),
  period: z.enum(['total', 'monthly', 'hourly', 'yearly', 'one_time']).nullable().optional(),
  isUnpaid: z.boolean().default(false).optional(),
  description: z.string().nullable().optional(),
});
export type Stipend = z.infer<typeof StipendSchema>;

export const OpportunitySchema = z.object({
  id: z.string().uuid(),
  canonicalUrl: z.string().url(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string(),
  organization: OrganizationSchema,
  category: OpportunityCategorySchema,
  verificationStatus: VerificationStatusSchema,
  confidence: z.number().min(0).max(1),
  publishedAt: z.string().datetime().nullable(),
  deadline: z.string().datetime().nullable(), // Null allowed! Never fabricate
  deadlineTz: z.string().nullable().optional(),
  isDeadlineEstimated: z.boolean().default(false).optional(),
  stipend: StipendSchema.nullable().optional(),
  locations: z.array(LocationSchema).default([]),
  benefits: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  applyUrl: z.string().url(),
  isSaved: z.boolean().default(false).optional(),
  applicationStatus: ApplicationStatusSchema.nullable().optional(),
  evidence: z.array(ContentEvidenceSchema).default([]),
  // Personal Intelligence Match (when personalized)
  relevanceScore: z.number().min(0).max(100).nullable().optional(),
  eligibilityStatus: EligibilityStatusSchema.nullable().optional(),
  eligibilityAssessment: EligibilityAssessmentSchema.nullable().optional(),
  relevanceBreakdown: RelevanceBreakdownSchema.nullable().optional(),
  priority: z.number().nullable().optional(),
  isOpenToNigeria: z.boolean().default(false).optional(),
  matchExplanation: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Opportunity = z.infer<typeof OpportunitySchema>;

export const OpportunityFilterSchema = z.object({
  search: z.string().optional(),
  categories: z.array(OpportunityCategorySchema).optional(),
  verificationStatuses: z.array(VerificationStatusSchema).optional(),
  eligibilityStatuses: z.array(EligibilityStatusSchema).optional(),
  isRemoteOnly: z.boolean().optional(),
  hasStipend: z.boolean().optional(),
  minRelevanceScore: z.number().min(0).max(100).optional(),
  deadlineBefore: z.string().datetime().optional(),
  deadlineAfter: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
  cursor: z.string().optional(),
});
export type OpportunityFilter = z.infer<typeof OpportunityFilterSchema>;

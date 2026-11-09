import { z } from 'zod';
import { EligibilityStatusSchema } from './enums';

export const EligibilityRequirementSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  requirementType: z.string(), // e.g. 'education_level', 'location', 'age', 'enrolled_student'
  description: z.string(),
  isMandatory: z.boolean().default(true),
  rule: z.record(z.unknown()).default({}),
});
export type EligibilityRequirement = z.infer<typeof EligibilityRequirementSchema>;

export const EligibilityAssessmentSchema = z.object({
  status: EligibilityStatusSchema,
  reasons: z.array(z.string()),
  blockers: z.array(z.string()).default([]),
  missingInfo: z.array(z.string()).default([]),
});
export type EligibilityAssessment = z.infer<typeof EligibilityAssessmentSchema>;

export const MatchSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  userId: z.string().uuid(),
  relevanceScore: z.number().min(0).max(100),
  relevanceFactors: z.array(z.string()),
  eligibilityStatus: EligibilityStatusSchema,
  eligibilityAssessment: EligibilityAssessmentSchema,
  explanation: z.string(),
  createdAt: z.string().datetime(),
});
export type Match = z.infer<typeof MatchSchema>;

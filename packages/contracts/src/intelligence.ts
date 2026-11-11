import { z } from 'zod';
import { EligibilityStatusSchema } from './enums';

export const EligibilityCriterionResultSchema = z.object({
  criterion: z.enum([
    'education_level',
    'field_of_study',
    'country',
    'age',
    'experience',
    'skills',
    'graduation_year',
    'work_authorization',
    'other',
  ]),
  requirementDescription: z.string(),
  profileValue: z.string(),
  requirementValue: z.string(),
  result: z.enum(['meets', 'likely', 'unknown', 'fails']),
  isMandatory: z.boolean().default(true),
  evidenceUrl: z.string().optional(),
  notes: z.string().default(''),
});
export type EligibilityCriterionResult = z.infer<typeof EligibilityCriterionResultSchema>;

export const EligibilityRequirementSchema = z.object({
  id: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  requirementType: z.string(), // education_level, country, age, etc.
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
  criteriaResults: z.array(EligibilityCriterionResultSchema).default([]),
  engineVersion: z.string().default('v1.0'),
  evaluatedAt: z.string().datetime().optional(),
});
export type EligibilityAssessment = z.infer<typeof EligibilityAssessmentSchema>;

export const RelevanceBreakdownSchema = z.object({
  categoryScore: z.number().min(0).max(100),
  skillsScore: z.number().min(0).max(100),
  educationScore: z.number().min(0).max(100),
  geographyScore: z.number().min(0).max(100),
  benefitsScore: z.number().min(0).max(100),
  orgScore: z.number().min(0).max(100),
  timingScore: z.number().min(0).max(100),
  totalScore: z.number().min(0).max(100),
  weights: z.record(z.number()),
  factors: z.array(z.string()).default([]),
});
export type RelevanceBreakdown = z.infer<typeof RelevanceBreakdownSchema>;

export const MatchSchema = z.object({
  id: z.string().uuid().optional(),
  opportunityId: z.string().uuid(),
  userId: z.string().uuid(),
  relevanceScore: z.number().min(0).max(100),
  relevanceFactors: z.array(z.string()).default([]),
  relevanceBreakdown: RelevanceBreakdownSchema.optional(),
  eligibilityStatus: EligibilityStatusSchema,
  eligibilityAssessment: EligibilityAssessmentSchema,
  explanation: z.string(),
  priority: z.number().optional(),
  createdAt: z.string().datetime().optional(),
});
export type Match = z.infer<typeof MatchSchema>;

export const UserFeedbackActionSchema = z.object({
  opportunityId: z.string().uuid(),
  action: z.enum(['save', 'apply', 'thumbs_up', 'thumbs_down', 'dismiss']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
export type UserFeedbackAction = z.infer<typeof UserFeedbackActionSchema>;

export const ProfileCompletenessSchema = z.object({
  percentage: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
  completedFields: z.array(z.string()),
  impactNotes: z.array(z.string()),
});
export type ProfileCompleteness = z.infer<typeof ProfileCompletenessSchema>;

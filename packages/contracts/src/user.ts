import { z } from 'zod';
import { OpportunityCategorySchema } from './enums';

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string().min(1),
  email: z.string().email(),
  headline: z.string(),
  degree: z.string(),
  major: z.string(),
  yearOfStudy: z.string(), // e.g. "200-level" / "Sophomore"
  university: z.string(),
  country: z.string(),
  timezone: z.string().default('Africa/Lagos'),
  bio: z.string(),
  skills: z.array(z.string()).default([]),
  targetRoles: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  links: z.object({
    github: z.string().url().or(z.literal('')).optional(),
    linkedin: z.string().url().or(z.literal('')).optional(),
    portfolio: z.string().url().or(z.literal('')).optional(),
    cvUrl: z.string().url().or(z.literal('')).optional(),
  }).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UpdateUserProfileSchema = UserProfileSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;

export const UserPreferencesSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  targetCategories: z.array(OpportunityCategorySchema).default([
    'internship',
    'fellowship',
    'hackathon_ctf',
    'dev_programme',
    'oss_bounty',
    'funding',
  ]),
  minRelevanceScore: z.number().min(0).max(100).default(60),
  notifyInApp: z.boolean().default(true),
  notifyEmail: z.boolean().default(true),
  digestFrequency: z.enum(['daily', 'weekly', 'none']).default('daily'),
  digestTime: z.string().default('08:00'),
  reminderDays: z.array(z.number()).default([14, 7, 3, 1]),
  excludedKeywords: z.array(z.string()).default([]),
  monthlyBudgetCap: z.number().default(10),
  searchBudgetCap: z.number().default(4),
  llmBudgetCap: z.number().default(5),
  bufferBudgetCap: z.number().default(1),
  updatedAt: z.string().datetime(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UpdateUserPreferencesSchema = UserPreferencesSchema.partial().omit({
  id: true,
  userId: true,
  updatedAt: true,
});
export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>;

import { z } from 'zod';

export const OpportunityCategorySchema = z.enum([
  'job',
  'internship',
  'dev_programme',
  'hackathon_ctf',
  'fellowship',
  'scholarship',
  'accelerator',
  'oss_bounty',
  'event',
  'funding',
  'research',
  'other',
]);
export type OpportunityCategory = z.infer<typeof OpportunityCategorySchema>;

export const VerificationStatusSchema = z.enum([
  'unverified',
  'partially_verified',
  'verified',
  'expired',
  'disputed',
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const EligibilityStatusSchema = z.enum([
  'eligible',
  'likely_eligible',
  'possibly_eligible',
  'ineligible',
  'unknown',
]);
export type EligibilityStatus = z.infer<typeof EligibilityStatusSchema>;

export const ConnectorStatusSchema = z.enum([
  'active',
  'active_limited',
  'authorization_required',
  'manual_capture_only',
  'unavailable',
]);
export type ConnectorStatus = z.infer<typeof ConnectorStatusSchema>;

export const ConnectorTypeSchema = z.enum([
  'website',
  'rss_feed',
  'github',
  'x_twitter',
  'linkedin',
  'telegram',
  'discord',
  'reddit',
  'youtube',
  'instagram',
  'newsletter_email',
  'custom_crawler',
]);
export type ConnectorType = z.infer<typeof ConnectorTypeSchema>;

export const ApplicationStatusSchema = z.enum([
  'saved',
  'interested',
  'preparing',
  'applied',
  'submitted',
  'assessment',
  'interview',
  'interviewing',
  'accepted',
  'offered',
  'rejected',
  'withdrawn',
  'closed',
  'archived',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const NotificationTypeSchema = z.enum([
  'priority_alert',
  'daily_digest',
  'deadline_reminder',
  'status_changed',
  'source_issue',
  'budget_threshold',
  'system',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

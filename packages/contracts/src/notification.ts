import { z } from 'zod';
import { NotificationTypeSchema } from './enums';

export const NotificationPrioritySchema = z.enum(['immediate', 'digest', 'low']);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.default('immediate'),
  idempotencyKey: z.string().nullable().optional(),
  entityType: z.enum(['opportunity', 'application', 'source', 'system']).nullable().optional(),
  entityId: z.string().nullable().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().nullable().optional(),
  read: z.boolean().default(false),
  readAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationPreferencesSchema = z.object({
  highPriorityThreshold: z.number().int().min(50).max(100).default(85),
  digestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('08:00'),
  timezone: z.string().default('Africa/Lagos'),
  reminderOffsets: z.array(z.number().int().positive()).default([14, 7, 3, 1]),
  categoryPreferences: z.record(z.boolean()).default({
    fellowship: true,
    internship: true,
    hackathon_ctf: true,
    dev_programme: true,
    scholarship: true,
    research: true,
  }),
  emailEnabled: z.boolean().default(true),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const NotificationDeliverySchema = z.object({
  id: z.string().uuid(),
  notificationId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  channel: z.enum(['email', 'in_app']),
  idempotencyKey: z.string().min(1),
  providerId: z.string().nullable().optional(),
  status: z.enum(['queued', 'sent', 'failed', 'delivered']),
  attempts: z.number().int().default(1),
  lastError: z.string().nullable().optional(),
  sentAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type NotificationDelivery = z.infer<typeof NotificationDeliverySchema>;

export const EmailTemplatePreviewSchema = z.object({
  template: z.enum(['priority_alert', 'daily_digest', 'deadline_reminder']),
  subject: z.string(),
  html: z.string(),
  recipient: z.string(),
  generatedAt: z.string().datetime(),
});
export type EmailTemplatePreview = z.infer<typeof EmailTemplatePreviewSchema>;

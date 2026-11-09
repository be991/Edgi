import { z } from 'zod';
import { NotificationTypeSchema } from './enums';

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().nullable().optional(),
  read: z.boolean().default(false),
  readAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

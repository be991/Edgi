import { z } from 'zod';

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  website: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  country: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  verified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = OrganizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

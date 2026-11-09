import { z } from 'zod';

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiResponseMetaSchema = z.object({
  total: z.number().optional(),
  cursor: z.string().nullable().optional(),
  hasMore: z.boolean().optional(),
  isDemoData: z.boolean().default(false),
});
export type ApiResponseMeta = z.infer<typeof ApiResponseMetaSchema>;

export function createApiResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: itemSchema.optional(),
    meta: ApiResponseMetaSchema.optional(),
    error: ApiErrorSchema.optional(),
  });
}

import { z } from "zod";

export const paginationQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationMetadataSchema = z.object({
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  nextPageUrl: z.string().nullable(),
  previousPageUrl: z.string().nullable(),
});

export function paginatedResponseSchema<TSchema extends z.ZodTypeAny>(
  itemSchema: TSchema,
) {
  return z.object({
    data: z.array(itemSchema),
    pagination: paginationMetadataSchema,
  });
}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMetadata = z.infer<
  typeof paginationMetadataSchema
>;

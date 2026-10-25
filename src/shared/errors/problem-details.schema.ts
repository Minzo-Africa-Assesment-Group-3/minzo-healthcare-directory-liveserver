import { z } from "zod";

export const problemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    code: z.string().optional(),
    requestId: z.string().optional()
  })
  .passthrough();

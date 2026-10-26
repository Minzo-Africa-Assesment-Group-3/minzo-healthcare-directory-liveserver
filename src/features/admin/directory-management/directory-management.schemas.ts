import { z } from "zod";

export const countyManagementSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean()
});

export const cityManagementSchema = z.object({
  id: z.string().uuid(),
  countyId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean()
});

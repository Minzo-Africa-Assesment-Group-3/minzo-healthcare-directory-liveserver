import { z } from "zod";

export const businessServiceNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(150)
  .regex(/[a-z0-9]/i, "A service name must contain a letter or number.");

export function createBusinessServiceSlug(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const businessServiceNamesSchema = z
  .array(businessServiceNameSchema)
  .max(50)
  .refine(
    (services) => new Set(services.map(createBusinessServiceSlug)).size === services.length,
    "Services must not contain duplicates."
  );

export function normalizeBusinessServices(serviceNames: readonly string[]) {
  return serviceNames.map((name) => ({
    name: name.trim(),
    slug: createBusinessServiceSlug(name)
  }));
}

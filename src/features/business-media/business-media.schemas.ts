import { z } from "zod";

import {
  maximumVerifiedImageSizeBytes,
  verifiedImageMimeTypes,
} from "../../shared/images/verified-image.js";
import { maximumBusinessMediaItems } from "./business-media.js";

export const businessMediaStatusSchema = z.enum([
  "PENDING_UPLOAD",
  "UPLOADED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "DELETED",
]);

export const businessMediaBatchStatusSchema = z.enum([
  "UPLOADING",
  "PENDING_REVIEW",
  "REVIEWED",
  "CANCELLED",
]);

export const requestedBusinessMediaSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(verifiedImageMimeTypes),
  sizeBytes: z.number().int().positive().max(maximumVerifiedImageSizeBytes),
  altText: z.string().trim().min(1).max(255).optional(),
});

export const createBusinessMediaBatchBodySchema = z.object({
  files: z
    .array(requestedBusinessMediaSchema)
    .min(1)
    .max(maximumBusinessMediaItems),
});

export const businessMediaSchema = z.object({
  id: z.string().uuid(),
  batchId: z.string().uuid(),
  originalFileName: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().positive().nullable(),
  altText: z.string().nullable(),
  status: businessMediaStatusSchema,
  sortOrder: z.number().int().nonnegative(),
  isCover: z.boolean(),
  rejectionReason: z.string().nullable(),
  uploadedAt: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
});

export const publicBusinessMediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  altText: z.string().nullable(),
  isCover: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
});

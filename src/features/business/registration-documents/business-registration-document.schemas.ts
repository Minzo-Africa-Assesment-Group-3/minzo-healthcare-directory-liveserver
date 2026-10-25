import { z } from "zod";

import {
  maximumVerifiedDocumentSizeBytes,
  verifiedDocumentMimeTypes
} from "../../../shared/documents/verified-document.js";

export const businessRegistrationDocumentMimeTypeSchema = z.enum(verifiedDocumentMimeTypes);

export const requestBusinessRegistrationDocumentUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: businessRegistrationDocumentMimeTypeSchema,
  sizeBytes: z.number().int().positive().max(maximumVerifiedDocumentSizeBytes)
});

export const completedBusinessRegistrationDocumentSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  originalFileName: z.string(),
  mimeType: businessRegistrationDocumentMimeTypeSchema,
  sizeBytes: z.number().int().positive(),
  status: z.literal("ATTACHED"),
  uploadedAt: z.string().datetime()
});

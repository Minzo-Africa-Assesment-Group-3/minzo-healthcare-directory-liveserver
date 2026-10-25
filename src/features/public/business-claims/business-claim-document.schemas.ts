import { z } from "zod";

import { claimDocumentMimeTypes, maximumClaimDocumentSizeBytes } from "./business-claim-document.js";

export const claimDocumentMimeTypeSchema = z.enum(claimDocumentMimeTypes);

export const requestClaimDocumentUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: claimDocumentMimeTypeSchema,
  sizeBytes: z.number().int().positive().max(maximumClaimDocumentSizeBytes)
});

export const completedClaimDocumentSchema = z.object({
  id: z.string().uuid(),
  originalFileName: z.string(),
  mimeType: claimDocumentMimeTypeSchema,
  sizeBytes: z.number().int().positive(),
  status: z.enum(["UPLOADED", "ATTACHED"]),
  uploadedAt: z.string().datetime()
});

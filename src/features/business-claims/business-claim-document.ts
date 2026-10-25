import {
  detectVerifiedDocumentMimeType,
  maximumVerifiedDocumentSizeBytes,
  verifiedDocumentExtension,
  verifiedDocumentMimeTypes,
  type VerifiedDocumentMimeType
} from "../../shared/documents/verified-document.js";

export const maximumClaimDocumentSizeBytes = maximumVerifiedDocumentSizeBytes;

export const claimDocumentMimeTypes = verifiedDocumentMimeTypes;

export type ClaimDocumentMimeType = VerifiedDocumentMimeType;

export function detectClaimDocumentMimeType(bytes: Uint8Array): ClaimDocumentMimeType | null {
  return detectVerifiedDocumentMimeType(bytes);
}

export function createClaimDocumentObjectKey(options: {
  documentId: string;
  mimeType: ClaimDocumentMimeType;
  userId: string;
}): string {
  return [
    "business-claims",
    options.userId,
    `${options.documentId}.${verifiedDocumentExtension(options.mimeType)}`
  ].join("/");
}

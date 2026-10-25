import {
  verifiedDocumentExtension,
  type VerifiedDocumentMimeType
} from "../../../shared/documents/verified-document.js";

export function createBusinessRegistrationDocumentObjectKey(options: {
  businessId: string;
  documentId: string;
  mimeType: VerifiedDocumentMimeType;
  userId: string;
}): string {
  return [
    "business-registrations",
    options.businessId,
    options.userId,
    `${options.documentId}.${verifiedDocumentExtension(options.mimeType)}`
  ].join("/");
}

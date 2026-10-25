import { verifiedImageExtension, type VerifiedImageMimeType } from "../../shared/images/verified-image.js";

export const maximumBusinessMediaItems = 10;
export const signedMediaUploadLifetimeMilliseconds = 2 * 60 * 60 * 1_000;
export const signedMediaDownloadLifetimeSeconds = 60 * 60;

export function createBusinessMediaObjectKey(options: {
  batchId: string;
  businessId: string;
  mediaId: string;
  mimeType: VerifiedImageMimeType;
}): string {
  return [
    "business-media",
    options.businessId,
    options.batchId,
    `${options.mediaId}.${verifiedImageExtension(options.mimeType)}`
  ].join("/");
}

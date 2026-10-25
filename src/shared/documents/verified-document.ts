export const maximumVerifiedDocumentSizeBytes = 10 * 1024 * 1024;

export const verifiedDocumentMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;

export type VerifiedDocumentMimeType = (typeof verifiedDocumentMimeTypes)[number];

const extensionByMimeType: Record<VerifiedDocumentMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png"
};

function bytesStartWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectVerifiedDocumentMimeType(bytes: Uint8Array): VerifiedDocumentMimeType | null {
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }

  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  return null;
}

export function verifiedDocumentExtension(mimeType: VerifiedDocumentMimeType): string {
  return extensionByMimeType[mimeType];
}

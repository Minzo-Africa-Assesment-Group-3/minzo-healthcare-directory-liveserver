export const maximumVerifiedImageSizeBytes = 5 * 1024 * 1024;

export const verifiedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type VerifiedImageMimeType =
  (typeof verifiedImageMimeTypes)[number];

const extensionByMimeType: Record<VerifiedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function bytesStartWith(
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
): boolean {
  return signature.every(
    (value, index) => bytes[offset + index] === value,
  );
}

export function detectVerifiedImageMimeType(
  bytes: Uint8Array,
): VerifiedImageMimeType | null {
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    bytesStartWith(
      bytes,
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    )
  ) {
    return "image/png";
  }

  if (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytesStartWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }

  return null;
}

export function verifiedImageExtension(
  mimeType: VerifiedImageMimeType,
): string {
  return extensionByMimeType[mimeType];
}

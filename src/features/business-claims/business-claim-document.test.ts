import { describe, expect, it } from "vitest";

import { createClaimDocumentObjectKey, detectClaimDocumentMimeType } from "./business-claim-document.js";

describe("business claim document validation", () => {
  it.each([
    {
      expected: "application/pdf",
      bytes: [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]
    },
    {
      expected: "image/jpeg",
      bytes: [0xff, 0xd8, 0xff, 0xe0]
    },
    {
      expected: "image/png",
      bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    }
  ])("detects $expected by file signature", ({ bytes, expected }) => {
    expect(detectClaimDocumentMimeType(Uint8Array.from(bytes))).toBe(expected);
  });

  it("rejects content with an unsupported signature", () => {
    expect(detectClaimDocumentMimeType(Uint8Array.from([0x4d, 0x5a, 0x90]))).toBeNull();
  });

  it("generates a server-controlled path without the original filename", () => {
    expect(
      createClaimDocumentObjectKey({
        documentId: "document-id",
        mimeType: "application/pdf",
        userId: "user-id"
      })
    ).toBe("business-claims/user-id/document-id.pdf");
  });
});

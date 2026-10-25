import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { requestBusinessRegistrationDocumentUploadContract } from "./commands/request-document-upload/request-document-upload.contract.js";
import { createBusinessRegistrationDocumentObjectKey } from "./business-registration-document.js";

const businessId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const documentId = "9b2c7aaa-fb70-438c-a863-a31634985683";

describe("business registration documents", () => {
  it("validates metadata before authorizing an upload", () => {
    expect(
      requestBusinessRegistrationDocumentUploadContract.body.parse({
        fileName: "registration.pdf",
        mimeType: "application/pdf",
        sizeBytes: 25_000
      })
    ).toEqual({
      fileName: "registration.pdf",
      mimeType: "application/pdf",
      sizeBytes: 25_000
    });

    expect(() =>
      requestBusinessRegistrationDocumentUploadContract.body.parse({
        fileName: "malware.exe",
        mimeType: "application/octet-stream",
        sizeBytes: 25_000
      })
    ).toThrow();
  });

  it("generates a server-controlled business path", () => {
    expect(
      createBusinessRegistrationDocumentObjectKey({
        businessId: "business-id",
        documentId: "document-id",
        mimeType: "application/pdf",
        userId: "user-id"
      })
    ).toBe("business-registrations/business-id/user-id/document-id.pdf");
  });

  it("protects upload authorization", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies()
    });

    const response = await request(app)
      .post(`/api/v1/businesses/${businessId}/registration-document/upload-url`)
      .send({
        fileName: "registration.pdf",
        mimeType: "application/pdf",
        sizeBytes: 25_000
      });

    expect(response.status).toBe(401);
  });

  it("protects upload completion", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies()
    });

    const response = await request(app).post(
      `/api/v1/business-registration-documents/${documentId}/complete`
    );

    expect(response.status).toBe(401);
  });
});

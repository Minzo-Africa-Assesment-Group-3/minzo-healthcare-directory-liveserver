import request from "supertest";
import {
  describe,
  expect,
  it,
} from "vitest";

import { createApp } from "../../app.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { reviewBusinessClaimContract } from "./commands/review-business-claim/review-business-claim.contract.js";
import { requestClaimDocumentUploadContract } from "./commands/request-claim-document-upload/request-claim-document-upload.contract.js";
import { submitBusinessClaimContract } from "./commands/submit-business-claim/submit-business-claim.contract.js";

describe("business claim contracts", () => {
  it("accepts a claim only by verified document identifier", () => {
    expect(
      submitBusinessClaimContract.body.parse({
        requestedRole: "OWNER",
        claimantNote: "I am the registered owner of this facility.",
        evidenceDocumentId: "9b2c7aaa-fb70-438c-a863-a31634985683",
      }),
    ).toMatchObject({
      requestedRole: "OWNER",
      evidenceDocumentId: "9b2c7aaa-fb70-438c-a863-a31634985683",
    });
  });

  it("validates upload metadata before requesting a signed token", () => {
    expect(
      requestClaimDocumentUploadContract.body.parse({
        fileName: "registration.pdf",
        mimeType: "application/pdf",
        sizeBytes: 25_000,
      }),
    ).toEqual({
      fileName: "registration.pdf",
      mimeType: "application/pdf",
      sizeBytes: 25_000,
    });

    expect(() =>
      requestClaimDocumentUploadContract.body.parse({
        fileName: "registration.exe",
        mimeType: "application/octet-stream",
        sizeBytes: 25_000,
      }),
    ).toThrow();
  });

  it("requires an explanation when an administrator rejects a claim", () => {
    expect(() =>
      reviewBusinessClaimContract.body.parse({
        decision: "REJECTED",
      }),
    ).toThrow("A review note is required when rejecting a claim.");
  });
});

describe("business claim authentication", () => {
  const app = createApp({
    ...createTestHttpDependencies(),
    logger: createLogger({ environment: "test", level: "silent" }),
    routes: createTestRouteDependencies(),
  });

  it("rejects an unauthenticated claim before accessing the database", async () => {
    const response = await request(app)
      .post(
        "/api/v1/businesses/6b79e1dd-1c62-47c6-8985-c698f4346f45/claims",
      )
      .send({
        requestedRole: "OWNER",
        claimantNote: "I am the registered owner of this facility.",
        evidenceDocumentId: "9b2c7aaa-fb70-438c-a863-a31634985683",
      });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "authentication_required",
      status: 401,
    });
  });

  it("protects signed upload authorization", async () => {
    const response = await request(app)
      .post("/api/v1/business-claim-documents/upload-url")
      .send({
        fileName: "registration.pdf",
        mimeType: "application/pdf",
        sizeBytes: 25_000,
      });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "authentication_required",
      status: 401,
    });
  });

  it("protects upload completion without requiring a request body", async () => {
    const response = await request(app).post(
      "/api/v1/business-claim-documents/9b2c7aaa-fb70-438c-a863-a31634985683/complete",
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "authentication_required",
      status: 401,
    });
  });

  it("protects the administrator claim queue", async () => {
    const response = await request(app).get(
      "/api/v1/admin/business-claims",
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "authentication_required",
      status: 401,
    });
  });

  it("provides an active user principal to the protected handler", async () => {
    const userId = "8ca37e94-8469-4df9-a71c-134b122c82e5";
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        },
      },
      businessClaim: {
        async findMany() {
          return [];
        },
      },
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.authentication.database = database;
    routes.businessClaims.database = database;
    const accessToken = await routes.authPublic.accessToken.create({
      subjectId: userId,
    });
    const authenticatedApp = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes,
    });

    const response = await request(authenticatedApp)
      .get("/api/v1/business-claims/mine")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it("rejects a valid token when its user account is unavailable", async () => {
    const userId = "8ca37e94-8469-4df9-a71c-134b122c82e5";
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "SUSPENDED", deletedAt: null };
        },
      },
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.authentication.database = database;
    const accessToken = await routes.authPublic.accessToken.create({
      subjectId: userId,
    });
    const authenticatedApp = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes,
    });

    const response = await request(authenticatedApp)
      .get("/api/v1/business-claims/mine")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "account_unavailable",
      status: 403,
    });
  });
});

describe("business claim ownership", () => {
  const businessId = "6b79e1dd-1c62-47c6-8985-c698f4346f45";
  const claimId = "762d0bf6-0fa1-4a4d-aa97-c11521aa4b7b";
  const documentId = "9b2c7aaa-fb70-438c-a863-a31634985683";
  const userId = "8ca37e94-8469-4df9-a71c-134b122c82e5";

  it("allows an unverified imported business with no memberships to be claimed", async () => {
    const createdAt = new Date("2026-10-16T08:00:00.000Z");
    const transaction = {
      business: {
        async findUnique() {
          return {
            id: businessId,
            source: "IMPORTED",
            status: "APPROVED",
            verificationStatus: "UNVERIFIED",
            memberships: [],
            _count: { memberships: 0 },
          };
        },
      },
      businessClaimDocument: {
        async findFirst() {
          return {
            id: documentId,
            status: "UPLOADED",
            objectKey: `business-claims/${userId}/registration.pdf`,
            originalFileName: "registration.pdf",
            verifiedMimeType: "application/pdf",
            verifiedSizeBytes: 25_000,
          };
        },
        async updateMany() {
          return { count: 1 };
        },
      },
      businessClaim: {
        async create() {
          return {
            id: claimId,
            requestedRole: "OWNER" as const,
            status: "PENDING" as const,
            claimantNote: "I am the registered owner of this facility.",
            evidenceDocumentOriginalName: "registration.pdf",
            evidenceDocumentMimeType: "application/pdf",
            evidenceDocumentSizeBytes: 25_000,
            reviewedByAdminId: null,
            reviewedAt: null,
            reviewNote: null,
            createdAt,
            business: {
              id: businessId,
              displayName: "Monrovia Family Clinic",
              slug: "monrovia-family-clinic",
            },
          };
        },
      },
    };
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        },
      },
      async $transaction(
        callback: (client: typeof transaction) => Promise<unknown>,
      ) {
        return callback(transaction);
      },
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.authentication.database = database;
    routes.businessClaims.database = database;
    const accessToken = await routes.authPublic.accessToken.create({
      subjectId: userId,
    });
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes,
    });

    const response = await request(app)
      .post(`/api/v1/businesses/${businessId}/claims`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        requestedRole: "OWNER",
        claimantNote: "I am the registered owner of this facility.",
        evidenceDocumentId: documentId,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: claimId,
      status: "PENDING",
      business: { id: businessId },
    });
  });

  it("approves ownership and verifies the business", async () => {
    const adminUserId = "4d2bc928-6082-41f8-8814-7f073934da9c";
    const reviewedAt = new Date("2026-10-16T09:00:00.000Z");
    let membershipCreated = false;
    let businessVerificationUpdate:
      | {
          where: { id: string };
          data: {
            verificationStatus: "VERIFIED";
            verifiedAt: Date;
            verifiedByAdminId: string;
          };
        }
      | undefined;
    const transaction = {
      business: {
        async update(input: NonNullable<typeof businessVerificationUpdate>) {
          businessVerificationUpdate = input;
          return { id: businessId };
        },
      },
      businessClaim: {
        async findUnique() {
          return {
            id: claimId,
            businessId,
            claimantUserId: userId,
            requestedRole: "OWNER" as const,
            status: "PENDING" as const,
            business: {
              status: "APPROVED" as const,
              _count: { memberships: 0 },
            },
          };
        },
        async updateMany() {
          return { count: 0 };
        },
        async update() {
          return {
            id: claimId,
            requestedRole: "OWNER" as const,
            status: "APPROVED" as const,
            claimantNote: "I am the registered owner of this facility.",
            evidenceDocumentOriginalName: "registration.pdf",
            evidenceDocumentMimeType: "application/pdf",
            evidenceDocumentSizeBytes: 25_000,
            reviewedByAdminId: adminUserId,
            reviewedAt,
            reviewNote: null,
            createdAt: new Date("2026-10-16T08:00:00.000Z"),
            business: {
              id: businessId,
              displayName: "Monrovia Family Clinic",
              slug: "monrovia-family-clinic",
            },
            claimantUser: {
              id: userId,
              displayName: "Jane Doe",
              email: "jane@example.com",
              phone: null,
            },
          };
        },
      },
      businessMembership: {
        async upsert() {
          membershipCreated = true;
          return { userId, businessId, role: "OWNER" as const };
        },
      },
    };
    const database = {
      adminUser: {
        async findUnique() {
          return {
            id: adminUserId,
            status: "ACTIVE",
            roles: [
              {
                role: {
                  name: "SUPER_ADMIN",
                  permissions: [],
                },
              },
            ],
          };
        },
      },
      async $transaction(
        callback: (client: typeof transaction) => Promise<unknown>,
      ) {
        return callback(transaction);
      },
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.authentication.database = database;
    routes.businessClaims.database = database;
    const accessToken = await routes.authAdmin.accessToken.create({
      subjectId: adminUserId,
    });
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes,
    });

    const response = await request(app)
      .patch(`/api/v1/admin/business-claims/${claimId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ decision: "APPROVED" });

    expect(response.status).toBe(200);
    expect(membershipCreated).toBe(true);
    if (!businessVerificationUpdate) {
      throw new Error("Expected the approved claim to verify the business.");
    }
    expect(businessVerificationUpdate.where).toEqual({ id: businessId });
    expect(businessVerificationUpdate.data).toMatchObject({
      verificationStatus: "VERIFIED",
      verifiedByAdminId: adminUserId,
    });
    expect(businessVerificationUpdate.data.verifiedAt).toBeInstanceOf(Date);
    expect(response.body).toMatchObject({
      id: claimId,
      status: "APPROVED",
      reviewedByAdminId: adminUserId,
    });
  });
});

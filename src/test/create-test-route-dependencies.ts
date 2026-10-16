import type { DatabaseClient } from "../infrastructure/database/index.js";
import type { ObjectStorage } from "../infrastructure/storage/index.js";
import { createAccessTokenService } from "../shared/authentication/access-token.js";
import { createRateLimitMiddlewares } from "../shared/middleware/rate-limit.middleware.js";

const unexpectedStorageCall = async (): Promise<never> => {
  throw new Error("Object storage was not expected in this test.");
};

const objectStorage: ObjectStorage = {
  createSignedUploadAuthorization: unexpectedStorageCall,
  createSignedDownloadAuthorization: unexpectedStorageCall,
  getObjectInfo: unexpectedStorageCall,
  objectExists: unexpectedStorageCall,
  downloadObject: unexpectedStorageCall,
  removeObject: unexpectedStorageCall,
};

export function createTestRouteDependencies() {
  const userAccessToken = createAccessTokenService({
    audience: "test-client",
    issuer: "test-api",
    realm: "user",
    secret: "0".repeat(64),
    ttlSeconds: 900,
  });
  const adminAccessToken = createAccessTokenService({
    audience: "test-admin-client",
    issuer: "test-api",
    realm: "admin",
    secret: "0".repeat(64),
    ttlSeconds: 600,
  });
  return {
    authentication: {
      userAccessToken,
      adminAccessToken,
      database: {} as DatabaseClient,
    },
    authPublic: {
      accessToken: userAccessToken,
      database: {} as DatabaseClient,
      authEmail: {
        async sendVerificationEmail() {},
        async sendLoginOtp() {},
      },
      verificationTokenTtlSeconds: 86_400,
    },
    rateLimiters: createRateLimitMiddlewares(120, 60_000),
    businesses: { database: {} as DatabaseClient, objectStorage },
  };
}

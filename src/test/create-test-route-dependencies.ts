import type { DatabaseClient } from "../infrastructure/database/index.js";
import type { ObjectStorage } from "../infrastructure/storage/index.js";
import { createAccessTokenService } from "../shared/authentication/access-token.js";
import { createLoginOtpService } from "../shared/authentication/login-otp.js";
import { createRefreshTokenCookieService } from "../shared/authentication/refresh-token-cookie.js";
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
  const loginOtp = createLoginOtpService({
    secret: "1".repeat(64),
    ttlSeconds: 300,
  });
  return {
    authentication: {
      userAccessToken,
      adminAccessToken,
      database: {} as DatabaseClient,
    },
    authPublic: {
      accessToken: userAccessToken,
      accessTokenTtlSeconds: 900,
      database: {} as DatabaseClient,
      authEmail: {
        async sendVerificationEmail() {},
        async sendLoginOtp() {},
      },
      loginOtp,
      maxOtpAttempts: 5,
      refreshTokenCookie: createRefreshTokenCookieService({
        name: "refresh_token",
        path: "/api/v1/auth",
        secure: false,
      }),
      refreshTokenTtlSeconds: 2_592_000,
      verificationTokenTtlSeconds: 86_400,
    },
    authAdmin: {
      accessToken: adminAccessToken,
    },
    businessRegistrationDocuments: {
      businessRegistrationsBucket: "business-registration-documents",
      database: {} as DatabaseClient,
      objectStorage,
    },
    cities: { database: {} as DatabaseClient },
    counties: { database: {} as DatabaseClient },
    rateLimiters: createRateLimitMiddlewares(120, 60_000),
    reviewModeration: { database: {} as DatabaseClient },
    reviews: { database: {} as DatabaseClient },
    businesses: { database: {} as DatabaseClient, objectStorage },
  };
}

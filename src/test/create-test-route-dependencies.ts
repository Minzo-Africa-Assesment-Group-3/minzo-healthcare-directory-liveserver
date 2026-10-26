import type { DatabaseClient } from "../infrastructure/database/index.js";
import type { ObjectStorage } from "../infrastructure/storage/index.js";
import { createAccessTokenService } from "../shared/authentication/access-token.js";
import { createLoginOtpService } from "../shared/authentication/login-otp.js";
import { createRefreshTokenCookieService } from "../shared/authentication/refresh-token-cookie.js";

const unexpectedStorageCall = async (): Promise<never> => {
  throw new Error("Object storage was not expected in this test.");
};

const objectStorage: ObjectStorage = {
  createSignedUploadAuthorization: unexpectedStorageCall,
  createSignedDownloadAuthorization: unexpectedStorageCall,
  getObjectInfo: unexpectedStorageCall,
  objectExists: unexpectedStorageCall,
  downloadObject: unexpectedStorageCall,
  removeObject: unexpectedStorageCall
};

export function createTestRouteDependencies() {
  const userAccessToken = createAccessTokenService({
    audience: "test-client",
    issuer: "test-api",
    realm: "user",
    secret: "0".repeat(64),
    ttlSeconds: 900
  });
  const adminAccessToken = createAccessTokenService({
    audience: "test-admin-client",
    issuer: "test-api",
    realm: "admin",
    secret: "0".repeat(64),
    ttlSeconds: 600
  });
  const loginOtp = createLoginOtpService({
    secret: "1".repeat(64),
    ttlSeconds: 300
  });
  return {
    adminAccessControl: { database: {} as DatabaseClient },
    adminDashboard: { database: {} as DatabaseClient },
    adminDirectoryManagement: { database: {} as DatabaseClient },
    assistant: {
      assistantClient: {
        async sendMessage() {
          return {
            answer: "Test assistant response.",
            conversation_id: "test-conversation",
            proposed_action: null
          };
        }
      }
    },
    auditLogs: { database: {} as DatabaseClient },
    authentication: {
      userAccessToken,
      adminAccessToken,
      database: {} as DatabaseClient
    },
    authPublic: {
      accessToken: userAccessToken,
      accessTokenTtlSeconds: 900,
      database: {} as DatabaseClient,
      authEmail: {
        async sendVerificationEmail() {},
        async sendLoginOtp() {},
        async sendPasswordResetEmail() {}
      },
      loginOtp,
      maxOtpAttempts: 5,
      passwordResetTokenTtlSeconds: 3_600,
      refreshTokenCookie: createRefreshTokenCookieService({
        name: "refresh_token",
        path: "/api/v1/auth",
        secure: false
      }),
      refreshTokenTtlSeconds: 2_592_000,
      verificationTokenTtlSeconds: 86_400
    },
    authAdmin: {
      accessToken: adminAccessToken,
      accessTokenTtlSeconds: 600,
      adminAuthEmail: {
        async sendInvitation() {},
        async sendLoginOtp() {}
      },
      database: {} as DatabaseClient,
      invitationTokenTtlSeconds: 259_200,
      loginOtp,
      maxOtpAttempts: 5,
      refreshTokenCookie: createRefreshTokenCookieService({
        name: "admin_refresh_token",
        path: "/api/v1/admin/auth",
        secure: false
      }),
      refreshTokenTtlSeconds: 86_400
    },
    businessRegistrationDocuments: {
      businessRegistrationsBucket: "business-registration-documents",
      database: {} as DatabaseClient,
      objectStorage
    },
    businessClaims: {
      businessClaimsBucket: "business-claim-documents",
      database: {} as DatabaseClient,
      objectStorage
    },
    businessFollows: { database: {} as DatabaseClient },
    businessModeration: {
      database: {} as DatabaseClient,
      objectStorage
    },
    cities: { database: {} as DatabaseClient },
    counties: { database: {} as DatabaseClient },
    currentUser: { database: {} as DatabaseClient },
    reviewModeration: {
      automationActorReference: "langchain-review-moderator-test",
      automationServiceKey: "a".repeat(64),
      database: {} as DatabaseClient,
      reviewRejectionNotificationQueue: {
        async enqueue() {},
        async initialize() {}
      }
    },
    reviews: {
      database: {} as DatabaseClient,
      moderationQueue: {
        async initialize() {},
        async enqueue() {}
      }
    },
    businesses: { database: {} as DatabaseClient, objectStorage },
    services: { database: {} as DatabaseClient }
  };
}

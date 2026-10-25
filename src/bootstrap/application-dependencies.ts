import type { Environment } from "../config/env.js";
import { createAiReviewModerationClient } from "../features/customer-feedback-moderation/services/ai-review-moderation-client.js";
import { createReviewModerationQueue } from "../features/customer-feedback-moderation/services/review-moderation-queue.js";
import { createReviewModerationWorker } from "../features/customer-feedback-moderation/services/review-moderation-worker.js";
import { createDatabaseClient, type DatabaseClient } from "../infrastructure/database/index.js";
import { createResendEmailSender } from "../infrastructure/email/index.js";
import { createLogger } from "../infrastructure/logging/index.js";
import { createJobQueue } from "../infrastructure/queue/index.js";
import { createSupabaseObjectStorage } from "../infrastructure/storage/index.js";
import type { ApplicationRouteDependencies } from "../routes.js";
import { createAccessTokenService } from "../shared/authentication/index.js";
import { createCorsMiddleware } from "../shared/middleware/cors.middleware.js";
import { createRateLimitMiddlewares } from "../shared/middleware/rate-limit.middleware.js";
import { createAuthPublicDependencies } from "./auth-public-dependencies.js";
import { createBackgroundJobs, type BackgroundJobs } from "./background-jobs.js";

export interface ApplicationDependencies {
  apiRateLimiter: ReturnType<typeof createRateLimitMiddlewares>["api"];
  backgroundJobs: BackgroundJobs;
  corsMiddleware: ReturnType<typeof createCorsMiddleware>;
  database: DatabaseClient;
  routes: ApplicationRouteDependencies;
  trustProxyHops: number;
}

export function createApplicationDependencies(env: Environment): ApplicationDependencies {
  const database = createDatabaseClient(env.DATABASE_URL);
  const logger = createLogger({
    environment: env.NODE_ENV,
    level: env.LOG_LEVEL
  });
  const jobQueue = createJobQueue({
    databaseUrl: env.DATABASE_URL,
    logger
  });
  const rateLimiters = createRateLimitMiddlewares(env.RATE_LIMIT_MAX_REQUESTS, env.RATE_LIMIT_WINDOW_MS);
  const emailSender = createResendEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM
  });
  const authPublic = createAuthPublicDependencies({
    database,
    emailSender,
    env
  });
  const adminAccessToken = createAccessTokenService({
    audience: env.ADMIN_JWT_AUDIENCE,
    issuer: env.JWT_ISSUER,
    realm: "admin",
    secret: env.ADMIN_JWT_ACCESS_SECRET,
    ttlSeconds: env.ADMIN_JWT_ACCESS_TOKEN_TTL_SECONDS
  });
  const objectStorage = createSupabaseObjectStorage({
    secretKey: env.SUPABASE_SECRET_KEY,
    url: env.SUPABASE_URL
  });
  const aiReviewModeration = env.SERVICE_API_KEY
    ? createAiReviewModerationClient({
        baseUrl: env.AI_SERVICE_URL,
        serviceKey: env.SERVICE_API_KEY,
        timeoutMs: env.AI_REQUEST_TIMEOUT_MS
      })
    : undefined;
  const reviewModerationQueue = createReviewModerationQueue(jobQueue);
  const reviewModerationWorker = aiReviewModeration
    ? createReviewModerationWorker({
        aiReviewModeration,
        database,
        jobQueue,
        logger
      })
    : undefined;

  return {
    apiRateLimiter: rateLimiters.api,
    backgroundJobs: createBackgroundJobs({
      jobQueue,
      reviewModerationWorker
    }),
    corsMiddleware: createCorsMiddleware(env.CORS_ALLOWED_ORIGINS),
    database,
    routes: {
      adminDashboard: { database },
      authentication: {
        adminAccessToken,
        database,
        userAccessToken: authPublic.accessToken
      },
      authPublic: {
        ...authPublic,
        rateLimiters: rateLimiters.authPublic
      },
      businessRegistrationDocuments: {
        businessRegistrationsBucket: env.SUPABASE_BUSINESS_REGISTRATIONS_BUCKET,
        database,
        objectStorage
      },
      businessClaims: {
        businessClaimsBucket: env.SUPABASE_BUSINESS_CLAIMS_BUCKET,
        database,
        objectStorage
      },
      businesses: {
        database,
        objectStorage
      },
      cities: { database },
      counties: { database },
      currentUser: { database },
      reviewModeration: {
        automationActorReference: env.AI_MODERATION_ACTOR_REFERENCE,
        automationServiceKey: env.AI_MODERATION_SERVICE_KEY,
        database
      },
      reviews: {
        database,
        moderationQueue: reviewModerationQueue,
        rateLimiters: rateLimiters.reviews
      }
    },
    trustProxyHops: env.TRUST_PROXY_HOPS
  };
}

import type { Environment } from "../config/env.js";
import { createAssistantClient } from "../features/public/assistant/services/assistant-client.js";
import { createAiReviewModerationClient } from "../features/admin/customer-reviews/services/ai-review-moderation-client.js";
import { createReviewModerationQueue } from "../features/admin/customer-reviews/services/review-moderation-queue.js";
import { createReviewModerationWorker } from "../features/admin/customer-reviews/services/review-moderation-worker.js";
import { createReviewRejectionEmailService } from "../features/admin/customer-reviews/services/review-rejection-email.js";
import { createReviewRejectionNotificationQueue } from "../features/admin/customer-reviews/services/review-rejection-notification-queue.js";
import { createReviewRejectionNotificationWorker } from "../features/admin/customer-reviews/services/review-rejection-notification-worker.js";
import { createDatabaseClient, type DatabaseClient } from "../infrastructure/database/index.js";
import { createResendEmailSender } from "../infrastructure/email/index.js";
import { createLogger } from "../infrastructure/logging/index.js";
import { createJobQueue } from "../infrastructure/queue/index.js";
import { createSupabaseObjectStorage } from "../infrastructure/storage/index.js";
import type { ApplicationRouteDependencies } from "../routes.js";
import { createCorsMiddleware } from "../shared/middleware/cors.middleware.js";
import { createRateLimitMiddlewares } from "../shared/middleware/rate-limit.middleware.js";
import { createAuthPublicDependencies } from "./auth-public-dependencies.js";
import { createAuthAdminDependencies } from "./auth-admin-dependencies.js";
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
    level: env.LOG_LEVEL,
    prettyPrint: env.LOG_PRETTY_PRINT
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
  const authAdmin = createAuthAdminDependencies({
    database,
    emailSender,
    env
  });
  const objectStorage = createSupabaseObjectStorage({
    secretKey: env.SUPABASE_SECRET_KEY,
    url: env.SUPABASE_URL
  });
  const assistantClient = createAssistantClient({
    baseUrl: env.AI_SERVICE_URL,
    serviceKey: env.SERVICE_API_KEY,
    timeoutMs: env.AI_REQUEST_TIMEOUT_MS
  });
  const aiReviewModeration = env.SERVICE_API_KEY
    ? createAiReviewModerationClient({
        baseUrl: env.AI_SERVICE_URL,
        serviceKey: env.SERVICE_API_KEY,
        timeoutMs: env.AI_REQUEST_TIMEOUT_MS
      })
    : undefined;
  const reviewModerationQueue = createReviewModerationQueue(jobQueue);
  const reviewRejectionNotificationQueue = createReviewRejectionNotificationQueue(jobQueue);
  const reviewRejectionEmail = createReviewRejectionEmailService(emailSender);
  const reviewModerationWorker = aiReviewModeration
    ? createReviewModerationWorker({
        aiReviewModeration,
        database,
        jobQueue,
        logger
      })
    : undefined;
  const reviewRejectionNotificationWorker = createReviewRejectionNotificationWorker({
    database,
    email: reviewRejectionEmail,
    jobQueue,
    logger
  });

  return {
    apiRateLimiter: rateLimiters.api,
    backgroundJobs: createBackgroundJobs({
      jobQueue,
      reviewModerationQueue,
      reviewModerationWorker,
      reviewRejectionNotificationQueue,
      reviewRejectionNotificationWorker
    }),
    corsMiddleware: createCorsMiddleware(env.CORS_ALLOWED_ORIGINS),
    database,
    routes: {
      adminAccessControl: { database },
      adminDashboard: { database },
      assistant: { assistantClient },
      auditLogs: { database },
      authentication: {
        adminAccessToken: authAdmin.accessToken,
        database,
        userAccessToken: authPublic.accessToken
      },
      authAdmin: {
        ...authAdmin,
        rateLimiters: rateLimiters.authAdmin
      },
      authPublic: {
        ...authPublic,
        rateLimiters: rateLimiters.authPublic
      },
      businessFollows: { database },
      businessModeration: {
        database,
        objectStorage
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
        database,
        reviewRejectionNotificationQueue
      },
      reviews: {
        database,
        moderationQueue: reviewModerationQueue,
        rateLimiters: rateLimiters.reviews
      },
      services: { database }
    },
    trustProxyHops: env.TRUST_PROXY_HOPS
  };
}

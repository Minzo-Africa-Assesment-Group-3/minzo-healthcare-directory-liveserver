import type { Environment } from "../config/env.js";
import {
  createDatabaseClient,
  type DatabaseClient,
} from "../infrastructure/database/index.js";
import { createResendEmailSender } from "../infrastructure/email/index.js";
import type { ApplicationRouteDependencies } from "../routes.js";
import { createCorsMiddleware } from "../shared/middleware/cors.middleware.js";
import { createRateLimitMiddlewares } from "../shared/middleware/rate-limit.middleware.js";
import { createAuthPublicDependencies } from "./auth-public-dependencies.js";

export interface ApplicationDependencies {
  apiRateLimiter: ReturnType<typeof createRateLimitMiddlewares>["api"];
  corsMiddleware: ReturnType<typeof createCorsMiddleware>;
  database: DatabaseClient;
  routes: ApplicationRouteDependencies;
  trustProxyHops: number;
}

export function createApplicationDependencies(
  env: Environment,
): ApplicationDependencies {
  const database = createDatabaseClient(env.DATABASE_URL);
  const rateLimiters = createRateLimitMiddlewares(
    env.RATE_LIMIT_MAX_REQUESTS,
    env.RATE_LIMIT_WINDOW_MS,
  );
  const emailSender = createResendEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
  });
  const authPublic = createAuthPublicDependencies({
    database,
    emailSender,
    env,
  });

  return {
    apiRateLimiter: rateLimiters.api,
    corsMiddleware: createCorsMiddleware(env.CORS_ALLOWED_ORIGINS),
    database,
    routes: { authPublic, rateLimiters },
    trustProxyHops: env.TRUST_PROXY_HOPS,
  };
}

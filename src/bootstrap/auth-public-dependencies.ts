import type { Environment } from "../config/env.js";
import { createAuthEmailService } from "../features/auth-public/services/index.js";
import type { AuthPublicRouteDependencies } from "../features/auth-public/routes.js";
import type { DatabaseClient } from "../infrastructure/database/index.js";
import type { EmailSender } from "../infrastructure/email/index.js";

interface CreateAuthPublicDependenciesOptions {
  database: DatabaseClient;
  emailSender: EmailSender;
  env: Environment;
}

export function createAuthPublicDependencies({
  database,
  emailSender,
  env,
}: CreateAuthPublicDependenciesOptions): AuthPublicRouteDependencies {
  const authEmail = createAuthEmailService(emailSender, env.FRONTEND_URL);

  return {
    database,
    authEmail,
    verificationTokenTtlSeconds: env.EMAIL_VERIFICATION_TOKEN_TTL_SECONDS,
  };
}

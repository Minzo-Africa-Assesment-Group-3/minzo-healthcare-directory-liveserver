import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import * as commands from "./commands/index.js";
import type {
  AuthEmailService,
} from "./services/index.js";
import type { AuthPublicRateLimitMiddlewares } from "../../shared/middleware/rate-limit.middleware.js";

const contract = initContract();

export const authPublicContract = contract.router({
  registerUser: commands.registerUserContract,
  registerBusiness: commands.registerBusinessContract,
});

export interface AuthPublicRouteDependencies {
  authEmail: AuthEmailService;
  database: DatabaseClient;
  verificationTokenTtlSeconds: number;
}

export function createAuthPublicHandlers(
  dependencies: AuthPublicRouteDependencies,
  rateLimiters: AuthPublicRateLimitMiddlewares,
) {
  return {
    registerUser: {
      middleware: [rateLimiters.register],
      handler: commands.createRegisterUserHandler(dependencies),
    },
    registerBusiness: {
      middleware: [rateLimiters.register],
      handler: commands.createRegisterBusinessHandler(dependencies),
    },
  };
}

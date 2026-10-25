import { createExpressEndpoints } from "@ts-rest/express";
import express, { type RequestHandler } from "express";
import type { Logger } from "pino";
import { createHttpLogger } from "../infrastructure/logging/index.js";
import { businessesContract, createBusinessesHandlers } from "../features/shared/businesses/routes.js";
import { createAuthenticationMiddlewares } from "../shared/authentication/authentication.middleware.js";
import { errorHandler } from "../shared/middleware/error-handler.middleware.js";
import { notFoundHandler } from "../shared/middleware/not-found.middleware.js";
import { sendProblemDetails } from "../shared/errors/problem-details.js";
import type { createTestRouteDependencies } from "./create-test-route-dependencies.js";

interface TestAppDependencies {
  routes: ReturnType<typeof createTestRouteDependencies>;
  logger: Logger;
  apiRateLimiter: RequestHandler;
  corsMiddleware: RequestHandler;
  trustProxyHops: number;
}

// These unfinished business endpoints are mounted only in integration tests.
export function createApp(dependencies: TestAppDependencies) {
  const { routes } = dependencies;
  const app = express();
  app.set("trust proxy", dependencies.trustProxyHops);
  app.use(createHttpLogger(dependencies.logger));
  app.use(dependencies.corsMiddleware);
  app.use("/api", dependencies.apiRateLimiter);
  app.use(express.json({ limit: "1mb" }));
  createExpressEndpoints(
    businessesContract,
    createBusinessesHandlers(routes.businesses, createAuthenticationMiddlewares(routes.authentication)),
    app,
    {
      logInitialization: false,
      responseValidation: true,
      requestValidationErrorHandler: (_error, request, response) => {
        sendProblemDetails(request, response, {
          code: "request_validation_failed",
          detail: "The request did not satisfy the API contract.",
          statusCode: 400,
          title: "Request validation failed"
        });
      }
    }
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

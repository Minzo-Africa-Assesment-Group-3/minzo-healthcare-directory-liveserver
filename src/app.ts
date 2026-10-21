import cookieParser from "cookie-parser";
import express, {
  type Express,
  type RequestHandler,
} from "express";
import type { Logger } from "pino";

import { createHttpLogger } from "./infrastructure/logging/index.js";
import { openApiRouter } from "./infrastructure/openapi/openapi.routes.js";
import { registerApplicationRoutes } from "./routes.js";
import type { ApplicationRouteDependencies } from "./routes.js";
import { errorHandler } from "./shared/middleware/error-handler.middleware.js";
import { notFoundHandler } from "./shared/middleware/not-found.middleware.js";

interface AppDependencies {
  apiRateLimiter: RequestHandler;
  corsMiddleware: RequestHandler;
  routes: ApplicationRouteDependencies;
  logger: Logger;
  trustProxyHops: number;
}

export function createApp({
  corsMiddleware,
  logger,
  routes,
  trustProxyHops,
}: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");

  if (trustProxyHops > 0) {
    app.set("trust proxy", trustProxyHops);
  }

  app.use(createHttpLogger(logger));
  app.use(corsMiddleware);
  // todo: add rate limiter - later
  // app.use("/api", apiRateLimiter);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  registerApplicationRoutes(app, routes);
  app.use(openApiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

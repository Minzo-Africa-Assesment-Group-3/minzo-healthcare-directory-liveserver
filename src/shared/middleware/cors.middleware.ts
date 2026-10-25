import cors, { type CorsOptions } from "cors";
import type { RequestHandler } from "express";

export function createCorsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  const originAllowlist = new Set(allowedOrigins);

  const options: CorsOptions = {
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    credentials: true,
    exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After", "X-Request-Id"],
    maxAge: 86_400,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin(origin, callback) {
      // Requests from non-browser clients do not send an Origin header.
      if (origin === undefined || originAllowlist.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    optionsSuccessStatus: 204
  };

  return cors(options);
}

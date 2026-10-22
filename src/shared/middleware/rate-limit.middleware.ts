import type { RequestHandler } from "express";
import {
  rateLimit,
  type Options,
} from "express-rate-limit";

import { sendProblemDetails } from "../errors/problem-details.js";

interface RateLimiterOptions {
  identifier: string;
  limit: number;
  skip?: Options["skip"];
  windowMs: number;
}

export interface AuthPublicRateLimitMiddlewares {
  credential: RequestHandler;
  registration: RequestHandler;
}

export interface RateLimitMiddlewares {
  api: RequestHandler;
  authPublic: AuthPublicRateLimitMiddlewares;
  reviews: ReviewsRateLimitMiddlewares;
}

export interface ReviewsRateLimitMiddlewares {
  write: RequestHandler;
}

const MINUTE = 60_000;
const FIFTEEN_MINUTES = 15 * MINUTE;
const HOUR = 60 * MINUTE;

export function createRateLimiter({
  identifier,
  limit,
  skip,
  windowMs,
}: RateLimiterOptions): RequestHandler {
  const options: Partial<Options> = {
    handler(request, response, _next, options) {
      sendProblemDetails(request, response, {
        code: "rate_limit_exceeded",
        detail: "Too many requests. Please wait before trying again.",
        statusCode: options.statusCode,
        title: "Too many requests",
      });
    },
    identifier,
    legacyHeaders: false,
    limit,
    passOnStoreError: false,
    standardHeaders: "draft-8",
    windowMs,
  };

  if (skip !== undefined) {
    options.skip = skip;
  }

  return rateLimit(options);
}

export function createRateLimitMiddlewares(
  apiLimit: number,
  apiWindowMs: number,
): RateLimitMiddlewares {
  return {
    api: createRateLimiter({
      identifier: "api",
      limit: apiLimit,
      skip: (request) =>
        request.method === "OPTIONS" ||
        request.path === "/api/v1/health",
      windowMs: apiWindowMs,
    }),
    authPublic: {
      credential: createRateLimiter({
        identifier: "auth-public-credential",
        limit: 5,
        windowMs: FIFTEEN_MINUTES,
      }),
      registration: createRateLimiter({
        identifier: "auth-public-registration",
        limit: 5,
        windowMs: HOUR,
      }),
    },
    reviews: {
      write: createRateLimiter({
        identifier: "review-write",
        limit: 20,
        windowMs: HOUR,
      }),
    },
  };
}

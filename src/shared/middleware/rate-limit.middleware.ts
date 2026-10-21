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
  login: RequestHandler;
  logout: RequestHandler;
  refreshToken: RequestHandler;
  register: RequestHandler;
  resendVerification: RequestHandler;
  verifyEmail: RequestHandler;
  verifyLoginOtp: RequestHandler;
}

export interface AuthAdminRateLimitMiddlewares {
  login: RequestHandler;
  logout: RequestHandler;
  refreshSession: RequestHandler;
  verifyLoginOtp: RequestHandler;
}

export interface RateLimitMiddlewares {
  api: RequestHandler;
  authAdmin: AuthAdminRateLimitMiddlewares;
  authPublic: AuthPublicRateLimitMiddlewares;
  contactMessages: ContactMessagesRateLimitMiddlewares;
  reviews: ReviewsRateLimitMiddlewares;
}

export interface ContactMessagesRateLimitMiddlewares {
  send: RequestHandler;
}

export interface ReviewsRateLimitMiddlewares {
  write: RequestHandler;
}

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
        request.method === "OPTIONS" || request.path === "/v1/health",
      windowMs: apiWindowMs,
    }),
    authAdmin: {
      login: createRateLimiter({
        identifier: "auth-admin-login",
        limit: 25,
        windowMs: 15 * 60_000,
      }),
      logout: createRateLimiter({
        identifier: "auth-admin-logout",
        limit: 100,
        windowMs: 15 * 60_000,
      }),
      refreshSession: createRateLimiter({
        identifier: "auth-admin-refresh",
        limit: 100,
        windowMs: 15 * 60_000,
      }),
      verifyLoginOtp: createRateLimiter({
        identifier: "auth-admin-verify-otp",
        limit: 30,
        windowMs: 15 * 60_000,
      }),
    },
    authPublic: {
      login: createRateLimiter({
        identifier: "auth-public-login",
        limit: 25,
        windowMs: 15 * 60_000,
      }),
      logout: createRateLimiter({
        identifier: "auth-public-logout",
        limit: 100,
        windowMs: 15 * 60_000,
      }),
      refreshToken: createRateLimiter({
        identifier: "auth-public-refresh",
        limit: 100,
        windowMs: 15 * 60_000,
      }),
      register: createRateLimiter({
        identifier: "auth-public-register",
        limit: 25,
        windowMs: 60 * 60_000,
      }),
      resendVerification: createRateLimiter({
        identifier: "auth-public-resend-verification",
        limit: 15,
        windowMs: 60 * 60_000,
      }),
      verifyEmail: createRateLimiter({
        identifier: "auth-public-verify-email",
        limit: 50,
        windowMs: 60 * 60_000,
      }),
      verifyLoginOtp: createRateLimiter({
        identifier: "auth-public-verify-otp",
        limit: 30,
        windowMs: 15 * 60_000,
      }),
    },
    contactMessages: {
      send: createRateLimiter({
        identifier: "business-contact-message-send",
        limit: 25,
        windowMs: 15 * 60_000,
      }),
    },
    reviews: {
      write: createRateLimiter({
        identifier: "review-write",
        limit: 100,
        windowMs: 60 * 60_000,
      }),
    },
  };
}

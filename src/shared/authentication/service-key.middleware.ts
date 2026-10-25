import { createHash, timingSafeEqual } from "node:crypto";

import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function createServiceKeyMiddleware(expectedServiceKey: string): RequestHandler {
  if (expectedServiceKey.length < 32) {
    throw new TypeError("The service authentication key must contain at least 32 characters.");
  }

  const expectedDigest = digest(expectedServiceKey);

  return (request, _response, next): void => {
    const suppliedServiceKey = request.get("X-Service-Key")?.trim();
    const isAuthenticated = suppliedServiceKey
      ? timingSafeEqual(digest(suppliedServiceKey), expectedDigest)
      : false;

    if (!isAuthenticated) {
      next(
        new AppError({
          code: "service_authentication_required",
          message: "A valid service credential is required.",
          statusCode: 401,
          title: "Service authentication required"
        })
      );
      return;
    }

    next();
  };
}

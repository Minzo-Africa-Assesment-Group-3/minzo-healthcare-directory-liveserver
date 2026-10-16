import { createCorsMiddleware } from "../shared/middleware/cors.middleware.js";
import { createRateLimiter } from "../shared/middleware/rate-limit.middleware.js";

export function createTestHttpDependencies() {
  return {
    apiRateLimiter: createRateLimiter({ identifier: "test-api", limit: 100, windowMs: 60_000 }),
    corsMiddleware: createCorsMiddleware(["http://localhost:5173"]),
    trustProxyHops: 0,
  };
}

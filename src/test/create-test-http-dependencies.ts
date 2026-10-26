import { createCorsMiddleware } from "../shared/middleware/cors.middleware.js";

export function createTestHttpDependencies() {
  return {
    corsMiddleware: createCorsMiddleware(["http://localhost:5173"]),
    trustProxyHops: 0
  };
}

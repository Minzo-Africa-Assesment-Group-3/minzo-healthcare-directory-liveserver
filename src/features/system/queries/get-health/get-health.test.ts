import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../../../app.js";
import { createLogger } from "../../../../infrastructure/logging/index.js";
import { createTestRouteDependencies } from "../../../../test/create-test-route-dependencies.js";
import { createTestHttpDependencies } from "../../../../test/create-test-http-dependencies.js";

describe("GET /api/v1/health", () => {
  const logger = createLogger({
    environment: "test",
    level: "silent"
  });

  const app = createApp({
    ...createTestHttpDependencies(),
    logger,
    routes: createTestRouteDependencies()
  });

  it("returns the application health status", async () => {
    const response = await request(app).get("/api/v1/health").set("x-request-id", "health-test-request");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/json/);
    expect(response.headers["x-request-id"]).toBe("health-test-request");

    expect(response.body).toEqual({
      status: "ok"
    });
  });
});

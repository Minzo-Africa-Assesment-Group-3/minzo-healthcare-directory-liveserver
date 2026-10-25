import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";

describe("HTTP error handling", () => {
  const logger = createLogger({
    environment: "test",
    level: "silent"
  });

  const app = createApp({
    ...createTestHttpDependencies(),
    logger,
    routes: createTestRouteDependencies()
  });

  it("returns Problem Details for an unknown route", async () => {
    const response = await request(app).get("/api/v1/unknown").set("x-request-id", "not-found-test");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/^application\/problem\+json/);

    expect(response.body).toEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "The requested route was not found",
      instance: "/api/v1/unknown",
      code: "route_not_found",
      requestId: "not-found-test"
    });
  });

  it("returns Problem Details for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/v1/unknown")
      .set("Content-Type", "application/json")
      .set("x-request-id", "invalid-json-test")
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toMatch(/^application\/problem\+json/);

    expect(response.body).toEqual({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "Request body contains invalid JSON",
      instance: "/api/v1/unknown",
      code: "invalid_json",
      requestId: "invalid-json-test"
    });
  });
});

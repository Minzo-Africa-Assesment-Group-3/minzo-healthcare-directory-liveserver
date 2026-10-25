import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createCorsMiddleware } from "./cors.middleware.js";
import { createRateLimiter } from "./rate-limit.middleware.js";

describe("CORS middleware", () => {
  const app = express();
  app.use(createCorsMiddleware(["http://localhost:5173"]));
  app.get("/resource", (_request, response) => {
    response.json({ status: "ok" });
  });

  it("allows a configured browser origin with credentials", async () => {
    const response = await request(app).get("/resource").set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not grant CORS access to an unconfigured origin", async () => {
    const response = await request(app).get("/resource").set("Origin", "https://untrusted.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("handles browser preflight requests", async () => {
    const response = await request(app)
      .options("/resource")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});

describe("rate-limit middleware", () => {
  it("returns Problem Details after the request limit is exceeded", async () => {
    const app = express();
    app.use(
      createRateLimiter({
        identifier: "test-policy",
        limit: 2,
        windowMs: 60_000
      })
    );
    app.get("/resource", (_request, response) => {
      response.json({ status: "ok" });
    });

    await request(app).get("/resource").expect(200);
    await request(app).get("/resource").expect(200);
    const response = await request(app).get("/resource");

    expect(response.status).toBe(429);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.headers["ratelimit-policy"]).toBeDefined();
    expect(response.body).toMatchObject({
      code: "rate_limit_exceeded",
      status: 429,
      title: "Too many requests"
    });
  });
});

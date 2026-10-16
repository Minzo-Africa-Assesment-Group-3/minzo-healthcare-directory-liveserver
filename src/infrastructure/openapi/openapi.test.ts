import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createLogger } from "../logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";

describe("API foundation", () => {
  const app = createApp({
    ...createTestHttpDependencies(),
    logger: createLogger({ environment: "test", level: "silent" }),
    routes: createTestRouteDependencies(),
  });

  it("documents the implemented API endpoints", async () => {
    const response = await request(app).get("/openapi.json").expect(200);
    const document = response.body as { paths: Record<string, unknown> };
    expect(Object.keys(document.paths).sort()).toEqual([
      "/api/v1/admin/customer-reviews",
      "/api/v1/admin/customer-reviews/{reviewId}/moderation",
      "/api/v1/auth/login",
      "/api/v1/auth/login/verify-otp",
      "/api/v1/auth/logout",
      "/api/v1/auth/refresh",
      "/api/v1/auth/register/business",
      "/api/v1/auth/register/user",
      "/api/v1/auth/resend-verification",
      "/api/v1/auth/verify-email",
      "/api/v1/business-registration-documents/{documentId}/complete",
      "/api/v1/businesses/{businessId}/customer-reviews",
      "/api/v1/businesses/{businessId}/rating",
      "/api/v1/businesses/{businessId}/registration-document/upload-url",
      "/api/v1/businesses/{businessId}/reviews",
      "/api/v1/cities",
      "/api/v1/counties",
      "/api/v1/health",
      "/api/v1/reviews/{reviewId}",
    ]);
  });

  it("serves health without caching and correlates the request", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("does not expose unimplemented business management endpoints", async () => {
    await request(app).get("/api/v1/businesses").expect(404);
  });

  it("validates login requests", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({})
      .expect(400);
    expect(response.body).toMatchObject({
      code: "request_validation_failed",
      status: 400,
    });
  });

  it.each(["user", "business"])("registers %s signup with request validation", async (kind) => {
    const response = await request(app)
      .post(`/api/v1/auth/register/${kind}`)
      .send({})
      .expect(400);
    expect(response.body).toMatchObject({ code: "request_validation_failed", status: 400 });
  });
});

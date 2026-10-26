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
    routes: createTestRouteDependencies()
  });

  it("documents the implemented API endpoints", async () => {
    const response = await request(app).get("/openapi.json").expect(200);
    const document = response.body as { paths: Record<string, unknown> };
    expect(Object.keys(document.paths).sort()).toEqual([
      "/api/v1/admin/audit-logs",
      "/api/v1/admin/auth/login",
      "/api/v1/admin/auth/login/verify-otp",
      "/api/v1/admin/auth/logout",
      "/api/v1/admin/auth/refresh",
      "/api/v1/admin/business-claims",
      "/api/v1/admin/business-claims/{claimId}",
      "/api/v1/admin/business-claims/{claimId}/evidence-download-url",
      "/api/v1/admin/businesses",
      "/api/v1/admin/businesses/{businessId}",
      "/api/v1/admin/businesses/{businessId}/moderation",
      "/api/v1/admin/cities",
      "/api/v1/admin/cities/{cityId}",
      "/api/v1/admin/counties",
      "/api/v1/admin/counties/{countyId}",
      "/api/v1/admin/customer-reviews",
      "/api/v1/admin/customer-reviews/{reviewId}/moderation",
      "/api/v1/admin/dashboard/overview",
      "/api/v1/admin/invitations",
      "/api/v1/admin/invitations/accept",
      "/api/v1/admin/invitations/{invitationId}/revoke",
      "/api/v1/admin/permissions",
      "/api/v1/admin/roles",
      "/api/v1/admin/roles/{roleId}/permissions",
      "/api/v1/admin/users",
      "/api/v1/admin/users/{adminUserId}/roles",
      "/api/v1/assistant/messages",
      "/api/v1/auth/forgot-password",
      "/api/v1/auth/login",
      "/api/v1/auth/login/verify-otp",
      "/api/v1/auth/logout",
      "/api/v1/auth/refresh",
      "/api/v1/auth/register/business",
      "/api/v1/auth/register/user",
      "/api/v1/auth/resend-verification",
      "/api/v1/auth/reset-password",
      "/api/v1/auth/verify-email",
      "/api/v1/automation/customer-reviews/{reviewId}/moderation",
      "/api/v1/business-claim-documents/upload-url",
      "/api/v1/business-claim-documents/{documentId}/complete",
      "/api/v1/business-claims/mine",
      "/api/v1/business-registration-documents/{documentId}/complete",
      "/api/v1/businesses",
      "/api/v1/businesses/{businessId}/claims",
      "/api/v1/businesses/{businessId}/customer-reviews",
      "/api/v1/businesses/{businessId}/dashboard/overview",
      "/api/v1/businesses/{businessId}/follow",
      "/api/v1/businesses/{businessId}/locations/{locationId}/services",
      "/api/v1/businesses/{businessId}/rating",
      "/api/v1/businesses/{businessId}/registration-document/upload-url",
      "/api/v1/businesses/{businessId}/reviews",
      "/api/v1/businesses/{slug}",
      "/api/v1/cities",
      "/api/v1/counties",
      "/api/v1/health",
      "/api/v1/me",
      "/api/v1/me/followed-businesses",
      "/api/v1/me/reviews",
      "/api/v1/reviews/{reviewId}",
      "/api/v1/services"
    ]);
  });

  it("documents Bearer authentication for protected endpoints", async () => {
    const response = await request(app).get("/openapi.json").expect(200);
    const document = response.body as {
      components: { securitySchemes: Record<string, unknown> };
      paths: Record<string, Record<string, { security?: unknown }>>;
    };

    expect(document.components.securitySchemes.userBearerAuth).toMatchObject({
      scheme: "bearer",
      type: "http"
    });
    expect(document.components.securitySchemes.adminBearerAuth).toMatchObject({
      scheme: "bearer",
      type: "http"
    });
    expect(document.paths["/api/v1/me"]?.get?.security).toEqual([{ userBearerAuth: [] }]);
  });

  it("serves health without caching and correlates the request", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("does not expose unimplemented nested business management endpoints", async () => {
    await request(app).get("/api/v1/businesses/example/locations").expect(404);
  });

  it("validates login requests", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({}).expect(400);
    expect(response.body).toMatchObject({
      code: "request_validation_failed",
      status: 400
    });
  });

  it.each(["user", "business"])("registers %s signup with request validation", async (kind) => {
    const response = await request(app).post(`/api/v1/auth/register/${kind}`).send({}).expect(400);
    expect(response.body).toMatchObject({ code: "request_validation_failed", status: 400 });
  });
});

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

  it("documents only health and the two registration endpoints", async () => {
    const response = await request(app).get("/openapi.json").expect(200);
    const document = response.body as { paths: Record<string, unknown> };
    expect(Object.keys(document.paths).sort()).toEqual([
      "/api/v1/auth/register/business",
      "/api/v1/auth/register/user",
      "/api/v1/health",
    ]);
  });

  it("serves health without caching and correlates the request", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("does not expose business management or login endpoints", async () => {
    await request(app).get("/api/v1/businesses").expect(404);
    await request(app).post("/api/v1/auth/login").expect(404);
  });

  it.each(["user", "business"])("registers %s signup with request validation", async (kind) => {
    const response = await request(app)
      .post(`/api/v1/auth/register/${kind}`)
      .send({})
      .expect(400);
    expect(response.body).toMatchObject({ code: "request_validation_failed", status: 400 });
  });
});

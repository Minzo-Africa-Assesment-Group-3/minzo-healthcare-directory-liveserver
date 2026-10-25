import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../test/create-business-test-app.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";
import { updateLocationServicesContract } from "./commands/update-location-services/update-location-services.contract.js";

const businessId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const locationId = "9b2c7aaa-fb70-438c-a863-a31634985683";
const userId = "8ca37e94-8469-4df9-a71c-134b122c82e5";

describe("business service contract", () => {
  it("accepts a complete replacement service list", () => {
    expect(
      updateLocationServicesContract.body.parse({
        services: ["General Practice", "Pharmacy"]
      })
    ).toEqual({
      services: ["General Practice", "Pharmacy"]
    });
  });

  it("allows an empty list to remove all location services", () => {
    expect(updateLocationServicesContract.body.parse({ services: [] })).toEqual({ services: [] });
  });

  it("rejects duplicate normalized service names", () => {
    expect(() =>
      updateLocationServicesContract.body.parse({
        services: ["Pharmacy", "pharmacy"]
      })
    ).toThrow("Services must not contain duplicates.");
  });
});

describe("business service endpoint", () => {
  it("requires an authenticated user", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies()
    });

    const response = await request(app)
      .put(`/api/v1/businesses/${businessId}/locations/${locationId}/services`)
      .send({ services: ["Pharmacy"] });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "authentication_required",
      status: 401
    });
  });

  it("replaces services for a location managed by the user", async () => {
    const createdLinks: Array<{
      businessLocationId: string;
      serviceId: string;
    }> = [];
    const transaction = {
      businessLocation: {
        async findUnique() {
          return {
            id: locationId,
            business: {
              status: "APPROVED",
              memberships: [{ role: "OWNER" }]
            }
          };
        }
      },
      service: {
        async upsert(args: { create: { id: string; name: string; slug: string } }) {
          return args.create;
        }
      },
      businessLocationService: {
        async deleteMany() {
          return { count: 1 };
        },
        async createMany(args: {
          data: Array<{
            businessLocationId: string;
            serviceId: string;
          }>;
        }) {
          createdLinks.push(...args.data);
          return { count: args.data.length };
        }
      }
    };
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        }
      },
      async $transaction(callback: (client: typeof transaction) => Promise<unknown>) {
        return callback(transaction);
      }
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.authentication.database = database;
    routes.businesses.database = database;
    const accessToken = await routes.authPublic.accessToken.create({
      subjectId: userId
    });
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes
    });

    const response = await request(app)
      .put(`/api/v1/businesses/${businessId}/locations/${locationId}/services`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ services: ["Pharmacy", "General Practice"] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      businessId,
      locationId,
      services: [
        { name: "General Practice", slug: "general-practice" },
        { name: "Pharmacy", slug: "pharmacy" }
      ]
    });
    expect(createdLinks).toHaveLength(2);
    expect(createdLinks.every((link) => link.businessLocationId === locationId)).toBe(true);
  });

  it("rejects a user who is not a business member", async () => {
    const transaction = {
      businessLocation: {
        async findUnique() {
          return {
            id: locationId,
            business: {
              status: "APPROVED",
              memberships: []
            }
          };
        }
      }
    };
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        }
      },
      async $transaction(callback: (client: typeof transaction) => Promise<unknown>) {
        return callback(transaction);
      }
    } as unknown as DatabaseClient;
    const routes = createTestRouteDependencies();
    routes.authentication.database = database;
    routes.businesses.database = database;
    const accessToken = await routes.authPublic.accessToken.create({
      subjectId: userId
    });
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes
    });

    const response = await request(app)
      .put(`/api/v1/businesses/${businessId}/locations/${locationId}/services`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ services: ["Pharmacy"] });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "permission_denied",
      status: 403
    });
  });
});

import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../test/create-business-test-app.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";

const businessId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const userId = "8ca37e94-8469-4df9-a71c-134b122c82e5";

function createAuthenticatedBusinessApp(database: DatabaseClient) {
  const routes = createTestRouteDependencies();
  routes.authentication.database = database;
  routes.businesses.database = database;

  return {
    accessToken: routes.authPublic.accessToken.create({ subjectId: userId }),
    app: createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes
    })
  };
}

describe("business dashboard and follows", () => {
  it("returns owner dashboard KPIs, including the follower count", async () => {
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        }
      },
      businessMembership: {
        async findUnique() {
          return { role: "OWNER" };
        }
      },
      business: {
        async findUnique() {
          return {
            id: businessId,
            displayName: "Example Medical Center",
            status: "APPROVED",
            verificationStatus: "VERIFIED"
          };
        }
      },
      businessFollow: {
        async count() {
          return 12;
        }
      },
      review: {
        async aggregate() {
          return { _avg: { stars: 4.25 }, _count: { _all: 8 } };
        }
      },
      businessContactMessage: {
        async count() {
          return 3;
        }
      },
      businessLocation: {
        async count() {
          return 2;
        }
      },
      businessStaffMember: {
        async count() {
          return 7;
        }
      },
      businessMedia: {
        async count() {
          return 1;
        }
      },
      async $transaction(values: Promise<unknown>[]) {
        return Promise.all(values);
      }
    } as unknown as DatabaseClient;
    const { accessToken, app } = createAuthenticatedBusinessApp(database);

    const response = await request(app)
      .get(`/api/v1/businesses/${businessId}/dashboard/overview`)
      .set("Authorization", `Bearer ${await accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      business: {
        id: businessId,
        status: "APPROVED",
        verificationStatus: "VERIFIED"
      },
      followers: { total: 12 },
      reviews: { total: 8, averageRating: 4.25 },
      messages: { unread: 3 },
      locations: { total: 2, active: 2 },
      staff: { total: 7 },
      gallery: { pendingReview: 1 }
    });
  });

  it("follows an approved business idempotently", async () => {
    let upsertedFollow: unknown;
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        }
      },
      business: {
        async findFirst() {
          return { id: businessId };
        }
      },
      businessFollow: {
        async upsert(input: unknown) {
          upsertedFollow = input;
        }
      }
    } as unknown as DatabaseClient;
    const { accessToken, app } = createAuthenticatedBusinessApp(database);

    const response = await request(app)
      .post(`/api/v1/businesses/${businessId}/follow`)
      .set("Authorization", `Bearer ${await accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ businessId, following: true });
    expect(upsertedFollow).toMatchObject({
      where: { userId_businessId: { businessId, userId } },
      create: { businessId, userId }
    });
  });
});

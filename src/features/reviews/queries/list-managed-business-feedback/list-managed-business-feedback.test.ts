import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../../../app.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { createLogger } from "../../../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../../../test/create-test-route-dependencies.js";
import { listManagedBusinessFeedbackContract } from "./list-managed-business-feedback.contract.js";

const businessId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const feedbackId = "9b2c7aaa-fb70-438c-a863-a31634985683";
const userId = "8ca37e94-8469-4df9-a71c-134b122c82e5";

function createTestApp(database: DatabaseClient) {
  const routes = createTestRouteDependencies();
  routes.authentication.database = database;
  routes.reviews.database = database;

  return {
    accessToken: routes.authPublic.accessToken.create({ subjectId: userId }),
    app: createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes
    })
  };
}

describe("managed business feedback", () => {
  it("applies dashboard query defaults", () => {
    expect(listManagedBusinessFeedbackContract.query.parse({})).toEqual({
      pageNumber: 1,
      pageSize: 20,
      sort: "NEWEST"
    });
  });

  it("requires authentication", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies()
    });

    const response = await request(app).get(`/api/v1/businesses/${businessId}/customer-reviews`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "authentication_required",
      status: 401
    });
  });

  it("rejects authenticated users who are not business members", async () => {
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        }
      },
      businessMembership: {
        async findUnique() {
          return null;
        }
      }
    } as unknown as DatabaseClient;
    const { accessToken, app } = createTestApp(database);

    const response = await request(app)
      .get(`/api/v1/businesses/${businessId}/customer-reviews`)
      .set("Authorization", `Bearer ${await accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "permission_denied",
      status: 403
    });
  });

  it("returns filtered hidden feedback without exposing an anonymous author", async () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    let findManyArguments: unknown;
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
      review: {
        async count() {
          return 1;
        },
        async findMany(args: unknown) {
          findManyArguments = args;
          return [
            {
              id: feedbackId,
              businessId,
              stars: 2,
              text: "The waiting time was too long.",
              isAnonymous: true,
              status: "HIDDEN",
              moderationStatus: "REJECTED",
              submittedAt: now,
              updatedAt: now,
              author: { displayName: "Private Customer" },
              moderationActions: [
                {
                  decision: "REJECTED",
                  reason: "Contains personal information.",
                  createdAt: now
                }
              ]
            }
          ];
        }
      },
      async $transaction(values: Promise<unknown>[]) {
        return Promise.all(values);
      }
    } as unknown as DatabaseClient;
    const { accessToken, app } = createTestApp(database);

    const response = await request(app)
      .get(`/api/v1/businesses/${businessId}/customer-reviews`)
      .query({
        moderationStatus: "REJECTED",
        publicationStatus: "HIDDEN",
        stars: 2,
        search: "waiting",
        sort: "RATING_LOW"
      })
      .set("Authorization", `Bearer ${await accessToken}`);
    const body = listManagedBusinessFeedbackContract.responses[200].parse(response.body);

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: feedbackId,
      author: null,
      publicationStatus: "HIDDEN",
      moderationStatus: "REJECTED"
    });
    expect(body.data[0]?.lastModeration?.decision).toBe("REJECTED");
    expect(body.data[0]?.lastModeration?.reason).toBe("Contains personal information.");
    expect(JSON.stringify(body)).not.toContain("Private Customer");
    expect(findManyArguments).toMatchObject({
      where: {
        businessId,
        moderationStatus: "REJECTED",
        status: "HIDDEN",
        stars: 2,
        text: { contains: "waiting", mode: "insensitive" }
      },
      orderBy: [{ stars: "asc" }, { submittedAt: "desc" }, { id: "desc" }]
    });
  });
});

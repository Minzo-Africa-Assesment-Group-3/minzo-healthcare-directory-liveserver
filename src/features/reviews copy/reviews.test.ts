import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";
import { createReviewContract } from "./commands/create-review/create-review.contract.js";
import { listBusinessReviewsContract } from "./queries/list-business-reviews/list-business-reviews.contract.js";
import { presentPublicReview } from "./review.presenter.js";

const businessId = "6f5c79f2-787c-44f0-a47f-92de621dd97a";
const reviewId = "9b2c7aaa-fb70-438c-a863-a31634985683";
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
      routes,
    }),
  };
}

describe("review privacy and validation", () => {
  it("defaults a review to named publication", () => {
    expect(
      createReviewContract.body.parse({
        stars: 5,
        text: "Excellent service.",
      }),
    ).toEqual({
      stars: 5,
      text: "Excellent service.",
      isAnonymous: false,
    });
  });

  it("rejects ratings outside the 1-to-5 range", () => {
    expect(() =>
      createReviewContract.body.parse({
        stars: 6,
        text: "Invalid rating.",
      }),
    ).toThrow();
  });

  it("removes author identity from an anonymous public review", () => {
    const result = presentPublicReview({
      id: reviewId,
      businessId,
      stars: 5,
      text: "Excellent service.",
      isAnonymous: true,
      submittedAt: new Date("2026-10-15T08:00:00.000Z"),
      updatedAt: new Date("2026-10-15T08:00:00.000Z"),
      author: { displayName: "Private Reviewer" },
    });

    expect(result.author).toBeNull();
    expect(result.mine).toBe(false);
    expect(result).not.toHaveProperty("userId");
  });
});

describe("review endpoints", () => {
  it("requires authentication when creating a review", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies(),
    });

    const response = await request(app)
      .post(`/api/v1/businesses/${businessId}/reviews`)
      .send({
        stars: 5,
        text: "Excellent service.",
        isAnonymous: true,
      });

    expect(response.status).toBe(401);
  });

  it("stores the author privately while returning an anonymous review", async () => {
    let storedUserId: string | undefined;
    const now = new Date();
    const transaction = {
      business: {
        async findFirst() {
          return { id: businessId };
        },
      },
      review: {
        async findUnique() {
          return null;
        },
        async create(args: {
          data: {
            businessId: string;
            userId: string;
            stars: number;
            text: string;
            isAnonymous: boolean;
            submittedAt: Date;
          };
        }) {
          storedUserId = args.data.userId;

          return {
            id: reviewId,
            businessId: args.data.businessId,
            stars: args.data.stars,
            text: args.data.text,
            isAnonymous: args.data.isAnonymous,
            submittedAt: args.data.submittedAt,
            updatedAt: now,
            author: { displayName: "Private Reviewer" },
          };
        },
      },
    };
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        },
      },
      async $transaction(
        callback: (client: typeof transaction) => Promise<unknown>,
      ) {
        return callback(transaction);
      },
    } as unknown as DatabaseClient;
    const { accessToken, app } = createTestApp(database);

    const response = await request(app)
      .post(`/api/v1/businesses/${businessId}/reviews`)
      .set("Authorization", `Bearer ${await accessToken}`)
      .send({
        stars: 5,
        text: "Excellent service.",
        isAnonymous: true,
      });

    expect(response.status).toBe(201);
    expect(storedUserId).toBe(userId);
    expect(response.body).toMatchObject({
      id: reviewId,
      isAnonymous: true,
      mine: true,
      author: null,
    });
    expect(response.body).not.toHaveProperty("userId");
  });

  it("lists reviews normally when no bearer token is supplied", async () => {
    const newerReviewId = "4cb10ac5-e1f0-45e8-bc5b-9e8990693659";
    const database = {
      business: {
        async findFirst() {
          return { id: businessId };
        },
      },
      async $transaction(
        callback: (client: {
          review: {
            count(): Promise<number>;
            findMany(): Promise<unknown[]>;
          };
        }) => Promise<unknown>,
      ) {
        return callback({
          review: {
            async count() {
              return 1;
            },
            async findMany() {
              return [
                {
                  id: newerReviewId,
                  businessId,
                  stars: 4,
                  text: "A recent experience.",
                  isAnonymous: false,
                  submittedAt: new Date("2026-10-15T09:00:00.000Z"),
                  updatedAt: new Date("2026-10-15T09:00:00.000Z"),
                  author: { displayName: "Recent Reviewer" },
                },
              ];
            },
          },
        });
      },
    } as unknown as DatabaseClient;
    const { app } = createTestApp(database);

    const response = await request(app).get(
      `/api/v1/businesses/${businessId}/reviews`,
    );
    const body = listBusinessReviewsContract.responses[200].parse(
      response.body,
    );

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({ id: newerReviewId, mine: false }),
    ]);
  });

  it("pins the authenticated user's review first when a bearer token is supplied", async () => {
    const otherReviewId = "4cb10ac5-e1f0-45e8-bc5b-9e8990693659";
    const mine = {
      id: reviewId,
      businessId,
      stars: 5,
      text: "My experience.",
      isAnonymous: true,
      submittedAt: new Date("2026-10-14T08:00:00.000Z"),
      updatedAt: new Date("2026-10-14T08:00:00.000Z"),
      author: { displayName: "Private Reviewer" },
    };
    const other = {
      id: otherReviewId,
      businessId,
      stars: 4,
      text: "A newer experience.",
      isAnonymous: false,
      submittedAt: new Date("2026-10-15T09:00:00.000Z"),
      updatedAt: new Date("2026-10-15T09:00:00.000Z"),
      author: { displayName: "Recent Reviewer" },
    };
    const database = {
      user: {
        async findUnique() {
          return { id: userId, status: "ACTIVE", deletedAt: null };
        },
      },
      business: {
        async findFirst() {
          return { id: businessId };
        },
      },
      async $transaction(
        callback: (client: {
          review: {
            count(): Promise<number>;
            findFirst(): Promise<typeof mine>;
            findMany(): Promise<(typeof other)[]>;
          };
        }) => Promise<unknown>,
      ) {
        return callback({
          review: {
            async count() {
              return 2;
            },
            async findFirst() {
              return mine;
            },
            async findMany() {
              return [other];
            },
          },
        });
      },
    } as unknown as DatabaseClient;
    const { accessToken, app } = createTestApp(database);

    const response = await request(app)
      .get(`/api/v1/businesses/${businessId}/reviews`)
      .set("Authorization", `Bearer ${await accessToken}`);
    const body = listBusinessReviewsContract.responses[200].parse(
      response.body,
    );

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({
        id: reviewId,
        mine: true,
        author: null,
      }),
      expect.objectContaining({ id: otherReviewId, mine: false }),
    ]);
  });

  it("rejects an invalid bearer token on the optionally authenticated listing", async () => {
    const { app } = createTestApp({} as DatabaseClient);

    const response = await request(app)
      .get(`/api/v1/businesses/${businessId}/reviews`)
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });

  it("calculates the current aggregate rating publicly", async () => {
    const database = {
      business: {
        async findFirst() {
          return { id: businessId };
        },
      },
      review: {
        async aggregate() {
          return {
            _avg: { stars: 4.333_333 },
            _count: { _all: 3 },
          };
        },
      },
    } as unknown as DatabaseClient;
    const { app } = createTestApp(database);

    const response = await request(app).get(
      `/api/v1/businesses/${businessId}/rating`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      businessId,
      averageRating: 4.33,
      reviewCount: 3,
      ratingWindowMonths: 12,
    });
  });
});

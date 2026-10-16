import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { createLogger } from "../../infrastructure/logging/index.js";
import { createTestHttpDependencies } from "../../test/create-test-http-dependencies.js";
import { createTestRouteDependencies } from "../../test/create-test-route-dependencies.js";
import { moderateCustomerFeedbackContract } from "./commands/moderate-customer-feedback/moderate-customer-feedback.contract.js";
import { moderateCustomerFeedback } from "./moderate-customer-feedback.js";
import { listCustomerFeedbackForModerationContract } from "./queries/list-customer-feedback/list-customer-feedback.contract.js";

const adminUserId = "8ca37e94-8469-4df9-a71c-134b122c82e5";
const feedbackId = "9b2c7aaa-fb70-438c-a863-a31634985683";
const moderationActionId = "479247ab-6aab-4af8-b9a9-e170e7e24d31";

function activeSuperAdmin() {
  return {
    id: adminUserId,
    status: "ACTIVE",
    roles: [
      {
        role: {
          name: "SUPER_ADMIN",
          permissions: [],
        },
      },
    ],
  };
}

function createTestApp(database: DatabaseClient) {
  const routes = createTestRouteDependencies();
  routes.authentication.database = database;
  routes.reviewModeration.database = database;

  return {
    accessToken: routes.authAdmin.accessToken.create({
      subjectId: adminUserId,
    }),
    app: createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes,
    }),
  };
}

describe("customer review moderation", () => {
  it("defaults the moderation queue to unreviewed feedback", () => {
    expect(listCustomerFeedbackForModerationContract.query.parse({})).toEqual({
      moderationStatus: "UNREVIEWED",
      pageNumber: 1,
      pageSize: 20,
    });
  });

  it("requires a reason when feedback is rejected", () => {
    expect(() =>
      moderateCustomerFeedbackContract.body.parse({
        decision: "REJECTED",
      }),
    ).toThrow();
  });

  it("protects the moderation queue from unauthenticated callers", async () => {
    const app = createApp({
      ...createTestHttpDependencies(),
      logger: createLogger({ environment: "test", level: "silent" }),
      routes: createTestRouteDependencies(),
    });

    const response = await request(app).get(
      "/api/v1/admin/customer-reviews",
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "authentication_required",
      status: 401,
    });
  });

  it("rejects published feedback and records the human moderation actor", async () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    let reviewUpdate: unknown;
    let moderationCreate: unknown;
    const transaction = {
      review: {
        async findUnique() {
          return {
            id: feedbackId,
            status: "PUBLISHED",
            moderationStatus: "UNREVIEWED",
            updatedAt: now,
          };
        },
        async updateMany(args: unknown) {
          reviewUpdate = args;
          return { count: 1 };
        },
      },
      reviewModerationAction: {
        async create(args: unknown) {
          moderationCreate = args;
          return {
            id: moderationActionId,
            actorType: "ADMIN",
            decision: "REJECTED",
            adminUserId,
            actorReference: null,
            reason: "Contains a personal attack.",
            createdAt: now,
          };
        },
      },
    };
    const database = {
      adminUser: {
        async findUnique() {
          return activeSuperAdmin();
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
      .patch(
        `/api/v1/admin/customer-reviews/${feedbackId}/moderation`,
      )
      .set("Authorization", `Bearer ${await accessToken}`)
      .send({
        decision: "REJECTED",
        reason: "Contains a personal attack.",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      reviewId: feedbackId,
      publicationStatus: "HIDDEN",
      moderationStatus: "REJECTED",
      moderation: {
        actorType: "ADMIN",
        decision: "REJECTED",
        adminUserId,
        reason: "Contains a personal attack.",
      },
    });
    expect(reviewUpdate).toMatchObject({
      data: {
        status: "HIDDEN",
        moderationStatus: "REJECTED",
      },
    });
    expect(moderationCreate).toMatchObject({
      data: {
        actorType: "ADMIN",
        adminUserId,
        decision: "REJECTED",
        reviewId: feedbackId,
      },
    });
  });

  it("records an external automation actor without impersonating an administrator", async () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    let moderationCreate: unknown;
    const transaction = {
      review: {
        async findUnique() {
          return {
            id: feedbackId,
            status: "PUBLISHED",
            moderationStatus: "UNREVIEWED",
            updatedAt: now,
          };
        },
        async updateMany() {
          return { count: 1 };
        },
      },
      reviewModerationAction: {
        async create(args: unknown) {
          moderationCreate = args;
          return {
            id: moderationActionId,
            actorType: "AUTOMATION",
            decision: "FLAGGED",
            adminUserId: null,
            actorReference: "langchain-feedback-moderator-v1",
            reason: "Potential personal medical information.",
            createdAt: now,
          };
        },
      },
    };
    const database = {
      async $transaction(
        callback: (client: typeof transaction) => Promise<unknown>,
      ) {
        return callback(transaction);
      },
    } as unknown as DatabaseClient;

    const result = await moderateCustomerFeedback({
      actor: {
        type: "AUTOMATION",
        actorReference: "langchain-feedback-moderator-v1",
      },
      database,
      decision: "FLAGGED",
      reviewId: feedbackId,
      reason: "Potential personal medical information.",
    });

    expect(result).toMatchObject({
      publicationStatus: "PUBLISHED",
      moderationStatus: "FLAGGED",
      moderation: {
        actorType: "AUTOMATION",
        actorReference: "langchain-feedback-moderator-v1",
      },
    });
    expect(moderationCreate).toMatchObject({
      data: {
        actorType: "AUTOMATION",
        actorReference: "langchain-feedback-moderator-v1",
        adminUserId: null,
        decision: "FLAGGED",
      },
    });
  });
});

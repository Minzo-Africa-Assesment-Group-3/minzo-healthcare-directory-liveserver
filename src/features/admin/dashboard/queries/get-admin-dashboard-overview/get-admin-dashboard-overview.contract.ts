import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

const countSchema = z.object({
  total: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  pendingApproval: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  unclaimed: z.number().int().nonnegative()
});

const dashboardActivitySchema = z.object({
  id: z.string(),
  type: z.enum([
    "BUSINESS_REGISTRATION_SUBMITTED",
    "BUSINESS_CLAIM_SUBMITTED",
    "CUSTOMER_REVIEW_SUBMITTED",
    "ADMIN_ACTION"
  ]),
  action: z.string().nullable(),
  occurredAt: z.string().datetime(),
  entity: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    type: z.string()
  })
});

export const adminDashboardOverviewSchema = z.object({
  businesses: countSchema,
  claims: z.object({
    pending: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative()
  }),
  reviews: z.object({
    published: z.number().int().nonnegative(),
    unreviewed: z.number().int().nonnegative(),
    flagged: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative()
  }),
  users: z.object({
    total: z.number().int().nonnegative(),
    pendingEmailVerification: z.number().int().nonnegative(),
    active: z.number().int().nonnegative()
  }),
  changes: z.object({
    businessesRegisteredThisWeek: z.number().int().nonnegative(),
    claimsSubmittedThisWeek: z.number().int().nonnegative(),
    reviewsSubmittedThisWeek: z.number().int().nonnegative(),
    usersRegisteredThisWeek: z.number().int().nonnegative()
  }),
  recentActivities: z.array(dashboardActivitySchema)
});

export const getAdminDashboardOverviewContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/dashboard/overview",
  strictStatusCodes: true,
  summary: "Get the admin dashboard overview",
  description: "Returns dashboard counts, weekly changes, and the most recent operational activity.",
  responses: {
    200: adminDashboardOverviewSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Dashboard"],
    authentication: "admin-access-token"
  }
});

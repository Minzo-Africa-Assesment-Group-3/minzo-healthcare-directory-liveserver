import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

const countSchema = z.object({
  total: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  pendingApproval: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  unclaimed: z.number().int().nonnegative()
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
  })
});

export const getAdminDashboardOverviewContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/dashboard/overview",
  strictStatusCodes: true,
  summary: "Get the admin dashboard overview",
  description: "Returns the operational counts used by the Minzo administrator dashboard.",
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

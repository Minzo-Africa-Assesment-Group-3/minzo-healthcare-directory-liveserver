import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const businessOwnerDashboardOverviewSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"]),
    verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"])
  }),
  followers: z.object({
    total: z.number().int().nonnegative()
  }),
  reviews: z.object({
    total: z.number().int().nonnegative(),
    averageRating: z.number().min(1).max(5).nullable()
  }),
  messages: z.object({
    unread: z.number().int().nonnegative()
  }),
  locations: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative()
  }),
  staff: z.object({
    total: z.number().int().nonnegative()
  }),
  gallery: z.object({
    pendingReview: z.number().int().nonnegative()
  })
});

export const getBusinessOwnerDashboardOverviewContract = contract.query({
  method: "GET",
  path: "/api/v1/businesses/:businessId/dashboard/overview",
  pathParams: z.object({ businessId: z.string().uuid() }),
  strictStatusCodes: true,
  summary: "Get the business owner dashboard overview",
  description: "Returns operational KPI counts for an authenticated owner or manager of a business.",
  responses: {
    200: businessOwnerDashboardOverviewSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Business Dashboard"]
  }
});

import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

const reviewBusinessRegistrationBodySchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVED"),
    reviewNote: z.string().trim().min(3).max(1000).optional()
  }),
  z.object({
    decision: z.literal("REJECTED"),
    reviewNote: z.string().trim().min(3).max(1000)
  })
]);

export const reviewBusinessRegistrationContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/admin/businesses/:businessId/moderation",
  pathParams: z.object({ businessId: z.string().uuid() }),
  body: reviewBusinessRegistrationBodySchema,
  strictStatusCodes: true,
  summary: "Moderate a business registration application",
  description:
    "Approves or rejects one pending self-registration. Approval verifies the business and activates its draft locations atomically.",
  responses: {
    200: z.object({
      businessId: z.string().uuid(),
      status: z.enum(["APPROVED", "REJECTED"]),
      verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"]),
      reviewedByAdminId: z.string().uuid(),
      reviewedAt: z.string().datetime(),
      reviewNote: z.string().nullable(),
      activatedLocationCount: z.number().int().nonnegative()
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Businesses"],
    authentication: "admin-access-token"
  }
});

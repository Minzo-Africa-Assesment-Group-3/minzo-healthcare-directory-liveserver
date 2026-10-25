import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { adminBusinessClaimResponseSchema } from "../../business-claim.schemas.js";

const contract = initContract();

const reviewBusinessClaimBodySchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reviewNote: z.string().trim().min(3).max(2_000).optional()
  })
  .superRefine((body, context) => {
    if (body.decision === "REJECTED" && !body.reviewNote) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A review note is required when rejecting a claim.",
        path: ["reviewNote"]
      });
    }
  });

export const reviewBusinessClaimContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/admin/business-claims/:claimId",
  pathParams: z.object({
    claimId: z.string().uuid()
  }),
  body: reviewBusinessClaimBodySchema,
  strictStatusCodes: true,
  summary: "Moderate a business claim",
  description:
    "Approves or rejects a pending claim. Approval creates the requested business membership atomically without changing the business verification status.",
  responses: {
    200: adminBusinessClaimResponseSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Business Claims"],
    authentication: "admin-access-token"
  }
});

import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { customerFeedbackModerationResultSchema } from "../../customer-feedback-moderation.schemas.js";

const contract = initContract();

const moderateCustomerFeedbackBodySchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVED"),
    reason: z.string().trim().min(3).max(1000).optional()
  }),
  z.object({
    decision: z.literal("REJECTED"),
    reason: z.string().trim().min(3).max(1000)
  })
]);

export const moderateCustomerFeedbackContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/admin/customer-reviews/:reviewId/moderation",
  pathParams: z.object({ reviewId: z.string().uuid() }),
  body: moderateCustomerFeedbackBodySchema,
  strictStatusCodes: true,
  summary: "Moderate a customer review",
  description:
    "Marks a published customer review as reviewed or rejects and hides it. Every decision is retained in an audit history with its actor.",
  responses: {
    200: customerFeedbackModerationResultSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Customer Reviews"],
    authentication: "admin-access-token"
  }
});

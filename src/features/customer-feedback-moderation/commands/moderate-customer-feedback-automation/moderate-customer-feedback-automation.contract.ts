import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { customerFeedbackModerationResultSchema } from "../../customer-feedback-moderation.schemas.js";

const contract = initContract();

const automationDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVED"),
    reason: z.string().trim().min(3).max(1000).optional(),
    reviewUpdatedAt: z.string().datetime()
  }),
  z.object({
    decision: z.enum(["FLAGGED", "REJECTED"]),
    reason: z.string().trim().min(3).max(1000),
    reviewUpdatedAt: z.string().datetime()
  })
]);

export const moderateCustomerFeedbackAutomationContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/automation/customer-reviews/:reviewId/moderation",
  pathParams: z.object({ reviewId: z.string().uuid() }),
  body: automationDecisionSchema,
  strictStatusCodes: true,
  summary: "Record an automated customer-review moderation decision",
  description:
    "Allows the trusted AI moderation service to approve, flag, or reject an unchanged customer review while recording an automation audit actor.",
  responses: {
    200: customerFeedbackModerationResultSchema,
    401: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Automated Customer Review Moderation"],
    authentication: "automation-service-key"
  }
});

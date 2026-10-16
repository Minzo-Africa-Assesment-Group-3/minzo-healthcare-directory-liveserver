import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import {
  paginatedResponseSchema,
  paginationQuerySchema,
} from "../../../../shared/pagination/index.js";
import {
  customerFeedbackModerationListItemSchema,
  customerFeedbackModerationStatusSchema,
} from "../../customer-feedback-moderation.schemas.js";

const contract = initContract();

export const listCustomerFeedbackForModerationContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/customer-reviews",
  query: paginationQuerySchema.extend({
    moderationStatus:
      customerFeedbackModerationStatusSchema.default("UNREVIEWED"),
    search: z.string().trim().min(1).max(200).optional(),
  }),
  strictStatusCodes: true,
  summary: "List customer reviews for moderation",
  description:
    "Returns customer reviews by moderation state. New reviews are public immediately but remain UNREVIEWED until a moderator records a decision.",
  responses: {
    200: paginatedResponseSchema(
      customerFeedbackModerationListItemSchema,
    ),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
  },
  metadata: {
    openApiTags: ["Admin Customer Reviews"],
    authentication: "admin-access-token",
  },
});

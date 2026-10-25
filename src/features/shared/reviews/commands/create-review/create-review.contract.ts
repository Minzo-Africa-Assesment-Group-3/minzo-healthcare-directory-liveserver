import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { publicReviewSchema, reviewStarsSchema, reviewTextSchema } from "../../review.schemas.js";

const contract = initContract();

export const createReviewContract = contract.mutation({
  method: "POST",
  path: "/api/v1/businesses/:businessId/reviews",
  pathParams: z.object({
    businessId: z.string().uuid()
  }),
  body: z.object({
    stars: reviewStarsSchema,
    text: reviewTextSchema,
    isAnonymous: z.boolean().default(false)
  }),
  strictStatusCodes: true,
  summary: "Submit a customer review",
  description:
    "Creates an authenticated user's rating and written feedback. Anonymous feedback retains its private author relationship for moderation but never exposes the author publicly.",
  responses: {
    201: publicReviewSchema,
    400: problemDetailsSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Customer Reviews"]
  }
});

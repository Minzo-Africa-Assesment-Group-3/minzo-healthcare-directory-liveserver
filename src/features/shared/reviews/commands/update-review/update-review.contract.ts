import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { publicReviewSchema, reviewStarsSchema, reviewTextSchema } from "../../review.schemas.js";

const contract = initContract();

const updateReviewBodySchema = z
  .object({
    stars: reviewStarsSchema.optional(),
    text: reviewTextSchema.optional(),
    isAnonymous: z.boolean().optional()
  })
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "At least one review field must be supplied."
  );

export const updateReviewContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/reviews/:reviewId",
  pathParams: z.object({
    reviewId: z.string().uuid()
  }),
  body: updateReviewBodySchema,
  strictStatusCodes: true,
  summary: "Update my customer review",
  description:
    "Updates a customer review owned by the authenticated user without renewing its rating or visibility window.",
  responses: {
    200: publicReviewSchema,
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

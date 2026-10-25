import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const deleteReviewContract = contract.mutation({
  method: "DELETE",
  path: "/api/v1/reviews/:reviewId",
  pathParams: z.object({
    reviewId: z.string().uuid()
  }),
  body: contract.noBody(),
  strictStatusCodes: true,
  summary: "Delete my customer review",
  description:
    "Soft-deletes a customer review owned by the authenticated user so it immediately leaves public listings and rating calculations.",
  responses: {
    204: contract.noBody(),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Customer Reviews"]
  }
});

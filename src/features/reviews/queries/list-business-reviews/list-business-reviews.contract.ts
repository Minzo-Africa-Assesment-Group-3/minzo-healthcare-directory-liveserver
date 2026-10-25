import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { paginatedResponseSchema, paginationQuerySchema } from "../../../../shared/pagination/index.js";
import { publicReviewSchema } from "../../review.schemas.js";

const contract = initContract();

export const listBusinessReviewsContract = contract.query({
  method: "GET",
  path: "/api/v1/businesses/:businessId/reviews",
  pathParams: z.object({
    businessId: z.string().uuid()
  }),
  query: paginationQuerySchema,
  strictStatusCodes: true,
  summary: "List a business's customer reviews",
  description:
    "Returns public customer reviews submitted within the last 24 months. When a valid user bearer token is supplied, that user's review is marked as mine and appears first. Anonymous reviews contain no public author identity.",
  responses: {
    200: paginatedResponseSchema(publicReviewSchema),
    400: problemDetailsSchema,
    404: problemDetailsSchema
  },
  metadata: {
    authentication: "optional-user-access-token",
    openApiTags: ["Customer Reviews"]
  }
});

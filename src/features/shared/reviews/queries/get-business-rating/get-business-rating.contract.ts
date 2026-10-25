import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { businessRatingSchema } from "../../review.schemas.js";

const contract = initContract();

export const getBusinessRatingContract = contract.query({
  method: "GET",
  path: "/api/v1/businesses/:businessId/rating",
  pathParams: z.object({
    businessId: z.string().uuid()
  }),
  strictStatusCodes: true,
  summary: "Get a business's aggregate rating",
  description:
    "Calculates the current average and count from published customer reviews submitted within the last 12 months.",
  responses: {
    200: businessRatingSchema,
    404: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Customer Reviews"]
  }
});

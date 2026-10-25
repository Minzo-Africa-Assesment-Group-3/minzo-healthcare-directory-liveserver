import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

export const unfollowBusinessContract = initContract().mutation({
  method: "DELETE",
  path: "/api/v1/businesses/:businessId/follow",
  pathParams: z.object({ businessId: z.string().uuid() }),
  body: initContract().noBody(),
  strictStatusCodes: true,
  summary: "Unfollow a business",
  description: "Idempotently removes your follow, including for a business no longer publicly listed.",
  responses: {
    200: z.object({
      businessId: z.string().uuid(),
      following: z.literal(false)
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Business Follows"]
  }
});

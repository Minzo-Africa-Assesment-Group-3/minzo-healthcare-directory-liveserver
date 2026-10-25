import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const unfollowBusinessContract = contract.mutation({
  method: "DELETE",
  path: "/api/v1/businesses/:businessId/follow",
  pathParams: z.object({ businessId: z.string().uuid() }),
  body: contract.noBody(),
  strictStatusCodes: true,
  summary: "Unfollow a business",
  description: "Removes the authenticated user's follow relationship when it exists.",
  responses: {
    200: z.object({
      businessId: z.string().uuid(),
      following: z.literal(false)
    }),
    401: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Business Follows"]
  }
});

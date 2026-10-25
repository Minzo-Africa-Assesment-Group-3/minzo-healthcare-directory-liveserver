import { initContract } from "@ts-rest/core";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { paginatedResponseSchema, paginationQuerySchema } from "../../../../shared/pagination/index.js";
import { adminBusinessClaimResponseSchema, businessClaimStatusSchema } from "../../business-claim.schemas.js";

const contract = initContract();

export const listBusinessClaimsContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/business-claims",
  query: paginationQuerySchema.extend({
    status: businessClaimStatusSchema.optional().default("PENDING")
  }),
  strictStatusCodes: true,
  summary: "List business claims",
  description: "Returns the paginated business-claim review queue for authorized Minzo administrators.",
  responses: {
    200: paginatedResponseSchema(adminBusinessClaimResponseSchema),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Business Claims"],
    authentication: "admin-access-token"
  }
});

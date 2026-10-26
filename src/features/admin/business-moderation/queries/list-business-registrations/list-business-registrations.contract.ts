import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { paginatedResponseSchema, paginationQuerySchema } from "../../../../../shared/pagination/index.js";
import {
  businessModerationListItemSchema,
  moderatableBusinessStatusSchema
} from "../../business-moderation.schemas.js";

const contract = initContract();

export const listBusinessRegistrationsContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/businesses",
  query: paginationQuerySchema.extend({
    status: moderatableBusinessStatusSchema.optional(),
    search: z.string().trim().min(1).max(200).optional()
  }),
  strictStatusCodes: true,
  summary: "List business registration applications",
  description:
    "Returns paginated self-registered businesses for Minzo administrators. Omit status to return all registrations.",
  responses: {
    200: paginatedResponseSchema(businessModerationListItemSchema),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Businesses"],
    authentication: "admin-access-token"
  }
});

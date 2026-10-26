import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { countyManagementSchema } from "../../directory-management.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const updateCountyContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/admin/counties/:countyId",
  pathParams: z.object({ countyId: z.string().uuid() }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      isActive: z.boolean().optional()
    })
    .refine((body) => body.name !== undefined || body.isActive !== undefined),
  strictStatusCodes: true,
  summary: "Update a county",
  description: "Changes a county name or active status. Inactive counties are hidden from public directory results.",
  responses: {
    200: countyManagementSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Directory Management"]
  }
});

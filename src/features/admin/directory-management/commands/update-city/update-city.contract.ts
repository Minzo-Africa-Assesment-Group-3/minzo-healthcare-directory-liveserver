import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { cityManagementSchema } from "../../directory-management.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const updateCityContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/admin/cities/:cityId",
  pathParams: z.object({ cityId: z.string().uuid() }),
  body: z
    .object({
      countyId: z.string().uuid().optional(),
      name: z.string().trim().min(2).max(100).optional(),
      isActive: z.boolean().optional()
    })
    .refine((body) => body.countyId !== undefined || body.name !== undefined || body.isActive !== undefined),
  strictStatusCodes: true,
  summary: "Update a city or town",
  description: "Changes a city or town name, county, or active status.",
  responses: {
    200: cityManagementSchema,
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

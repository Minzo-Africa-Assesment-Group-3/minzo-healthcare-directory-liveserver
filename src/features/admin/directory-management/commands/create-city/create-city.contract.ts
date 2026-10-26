import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { cityManagementSchema } from "../../directory-management.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const createCityContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/cities",
  body: z.object({
    countyId: z.string().uuid(),
    name: z.string().trim().min(2).max(100)
  }),
  strictStatusCodes: true,
  summary: "Create a city or town",
  description: "Adds an active city or town under an active county.",
  responses: {
    201: cityManagementSchema,
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

import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { countyManagementSchema } from "../../directory-management.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const createCountyContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/counties",
  body: z.object({ name: z.string().trim().min(2).max(100) }),
  strictStatusCodes: true,
  summary: "Create a county",
  description: "Adds an active county to the public directory catalogue.",
  responses: {
    201: countyManagementSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Directory Management"]
  }
});

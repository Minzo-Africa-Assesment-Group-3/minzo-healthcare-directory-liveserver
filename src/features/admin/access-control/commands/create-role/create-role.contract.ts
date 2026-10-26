import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { adminRoleSchema } from "../../access-control.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const createAdminRoleContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/roles",
  body: z.object({
    name: z.string().trim().min(2).max(100).regex(/^[A-Z][A-Z0-9_]*$/),
    description: z.string().trim().min(2).max(255).optional()
  }),
  strictStatusCodes: true,
  summary: "Create an administrator role",
  description: "Creates an empty custom role. Assign its permissions separately.",
  responses: {
    201: adminRoleSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Access Control"]
  }
});

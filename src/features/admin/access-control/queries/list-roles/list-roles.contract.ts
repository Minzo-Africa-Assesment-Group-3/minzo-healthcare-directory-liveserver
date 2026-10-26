import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { adminRoleSchema } from "../../access-control.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const listAdminRolesContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/roles",
  strictStatusCodes: true,
  summary: "List administrator roles",
  description: "Lists roles with their currently assigned permissions.",
  responses: {
    200: z.object({ data: z.array(adminRoleSchema) }),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Access Control"]
  }
});

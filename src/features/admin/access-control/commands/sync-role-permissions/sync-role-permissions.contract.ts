import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { adminRoleSchema } from "../../access-control.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const syncAdminRolePermissionsContract = contract.mutation({
  method: "PUT",
  path: "/api/v1/admin/roles/:roleId/permissions",
  pathParams: z.object({ roleId: z.string().uuid() }),
  body: z.object({ permissionIds: z.array(z.string().uuid()).max(100) }),
  strictStatusCodes: true,
  summary: "Replace a role's permissions",
  description: "Synchronizes the complete permission set for one custom administrator role.",
  responses: {
    200: adminRoleSchema,
    400: problemDetailsSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Access Control"]
  }
});

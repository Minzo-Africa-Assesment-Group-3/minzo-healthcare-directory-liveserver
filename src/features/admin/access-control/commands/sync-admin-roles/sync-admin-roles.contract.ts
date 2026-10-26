import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { administratorAccessSchema } from "../../access-control.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const syncAdministratorRolesContract = contract.mutation({
  method: "PUT",
  path: "/api/v1/admin/users/:adminUserId/roles",
  pathParams: z.object({ adminUserId: z.string().uuid() }),
  body: z.object({ roleIds: z.array(z.string().uuid()).min(1).max(20) }),
  strictStatusCodes: true,
  summary: "Replace an administrator's roles",
  description: "Synchronizes all assigned roles for one administrator.",
  responses: {
    200: administratorAccessSchema,
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

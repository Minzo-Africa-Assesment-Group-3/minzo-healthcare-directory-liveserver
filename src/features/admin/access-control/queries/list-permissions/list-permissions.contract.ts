import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { adminPermissionSchema } from "../../access-control.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const listAdminPermissionsContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/permissions",
  strictStatusCodes: true,
  summary: "List administrator permissions",
  description: "Lists the system-defined permissions available for custom administrator roles.",
  responses: {
    200: z.object({ data: z.array(adminPermissionSchema) }),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Access Control"]
  }
});

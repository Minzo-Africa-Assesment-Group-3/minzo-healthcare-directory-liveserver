import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { administratorAccessSchema } from "../../access-control.schemas.js";
import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const listAdministratorsContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/users",
  strictStatusCodes: true,
  summary: "List administrators",
  description: "Lists administrator accounts and their currently assigned roles.",
  responses: {
    200: z.object({ data: z.array(administratorAccessSchema) }),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Access Control"]
  }
});

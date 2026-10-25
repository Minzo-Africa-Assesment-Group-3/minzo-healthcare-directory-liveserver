import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { businessModerationDetailSchema } from "../../business-moderation.schemas.js";

const contract = initContract();

export const getBusinessRegistrationContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/businesses/:businessId",
  pathParams: z.object({ businessId: z.string().uuid() }),
  strictStatusCodes: true,
  summary: "Get a business registration application",
  description:
    "Returns the complete self-registration submission and a short-lived private registration-document URL.",
  responses: {
    200: businessModerationDetailSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Businesses"],
    authentication: "admin-access-token"
  }
});

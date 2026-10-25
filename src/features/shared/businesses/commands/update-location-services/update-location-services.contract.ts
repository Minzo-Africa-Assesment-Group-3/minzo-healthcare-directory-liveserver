import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { businessServiceNamesSchema } from "../../business-service.js";

const contract = initContract();

export const businessServiceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string()
});

export const updateLocationServicesContract = contract.mutation({
  method: "PUT",
  path: "/api/v1/businesses/:businessId/locations/:locationId/services",
  pathParams: z.object({
    businessId: z.string().uuid(),
    locationId: z.string().uuid()
  }),
  body: z.object({
    services: businessServiceNamesSchema
  }),
  strictStatusCodes: true,
  summary: "Replace the services offered at a business location",
  description:
    "Replaces the complete service list for a location managed by the authenticated business owner or manager. Service changes do not require separate administrator approval.",
  responses: {
    200: z.object({
      businessId: z.string().uuid(),
      locationId: z.string().uuid(),
      services: z.array(businessServiceResponseSchema)
    }),
    400: problemDetailsSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Businesses"]
  }
});

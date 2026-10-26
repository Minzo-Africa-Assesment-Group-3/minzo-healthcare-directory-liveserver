import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import {
  paginatedResponseSchema,
  paginationQuerySchema
} from "../../../../../shared/pagination/index.js";
import {
  adminInvitationSchema,
  adminInvitationStatusSchema
} from "../../admin-invitation.schemas.js";

const contract = initContract();

export const listAdminInvitationsContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/invitations",
  query: paginationQuerySchema.extend({
    status: adminInvitationStatusSchema.optional(),
    search: z.string().trim().min(1).max(200).optional()
  }),
  strictStatusCodes: true,
  summary: "List administrator invitations",
  description: "Lists administrator invitations, including their assigned role and current status.",
  responses: {
    200: paginatedResponseSchema(adminInvitationSchema),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Invitations"]
  }
});

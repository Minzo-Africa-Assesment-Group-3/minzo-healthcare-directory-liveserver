import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const revokeAdminInvitationContract = contract.mutation({
  method: "PATCH",
  path: "/api/v1/admin/invitations/:invitationId/revoke",
  pathParams: z.object({ invitationId: z.string().uuid() }),
  body: z.object({}),
  strictStatusCodes: true,
  summary: "Revoke an administrator invitation",
  description: "Revokes a pending administrator invitation so its token can no longer be accepted.",
  responses: {
    200: z.object({
      id: z.string().uuid(),
      status: z.literal("REVOKED"),
      revokedAt: z.string().datetime()
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Invitations"]
  }
});

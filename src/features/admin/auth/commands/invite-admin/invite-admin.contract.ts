import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const inviteAdminContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/invitations",
  strictStatusCodes: true,
  summary: "Invite an administrator",
  description: "Creates a one-time invitation for a new Minzo Africa administrator.",
  body: z.object({
    displayName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(320),
    roleName: z.string().trim().min(2).max(100)
  }),
  responses: {
    201: z.object({
      expiresAt: z.string().datetime(),
      id: z.string().uuid(),
      message: z.string()
    }),
    400: problemDetailsSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    409: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    authentication: "admin-access-token",
    openApiTags: ["Admin Invitations"]
  }
});

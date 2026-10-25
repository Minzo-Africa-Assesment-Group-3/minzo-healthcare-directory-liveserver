import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { paginatedResponseSchema, paginationQuerySchema } from "../../../../../shared/pagination/index.js";

const contract = initContract();

const auditLogSchema = z.object({
  id: z.string().uuid(),
  actor: z.object({
    type: z.enum(["ADMIN", "AUTOMATION"]),
    admin: z
      .object({
        id: z.string().uuid(),
        displayName: z.string(),
        email: z.string().email()
      })
      .nullable(),
    reference: z.string().nullable()
  }),
  action: z.string(),
  entity: z.object({
    type: z.string(),
    id: z.string().uuid()
  }),
  metadata: z.unknown().nullable(),
  createdAt: z.string().datetime()
});

export const listAuditLogsContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/audit-logs",
  query: paginationQuerySchema.extend({
    action: z.string().trim().min(1).max(150).optional(),
    actorType: z.enum(["ADMIN", "AUTOMATION"]).optional(),
    entityId: z.string().uuid().optional(),
    entityType: z.string().trim().min(1).max(100).optional()
  }),
  strictStatusCodes: true,
  summary: "List audit logs",
  description: "Returns a paginated history of sensitive administrator and automation actions.",
  responses: {
    200: paginatedResponseSchema(auditLogSchema),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Audit Logs"],
    authentication: "admin-access-token"
  }
});

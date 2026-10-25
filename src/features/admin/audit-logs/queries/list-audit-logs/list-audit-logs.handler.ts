import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { createPaginatedResponse } from "../../../../../shared/pagination/index.js";
import { requireAuditLogViewer } from "../../audit-log.authorization.js";
import { presentAuditLog } from "../../audit-log.presenter.js";
import { auditLogSelect } from "../../audit-log.select.js";
import type { listAuditLogsContract } from "./list-audit-logs.contract.js";

export function createListAuditLogsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listAuditLogsContract> {
  return async ({ query, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAuditLogViewer({
      adminUserId,
      database: dependencies.database
    });

    const where: Prisma.AuditLogWhereInput = {
      ...(query.action === undefined ? {} : { action: query.action }),
      ...(query.actorType === undefined ? {} : { actorType: query.actorType }),
      ...(query.entityId === undefined ? {} : { entityId: query.entityId }),
      ...(query.entityType === undefined ? {} : { entityType: query.entityType })
    };
    const [totalItems, records] = await dependencies.database.$transaction([
      dependencies.database.auditLog.count({ where }),
      dependencies.database.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: auditLogSelect
      })
    ]);

    return {
      status: 200,
      body: createPaginatedResponse({
        data: records.map(presentAuditLog),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems
      })
    };
  };
}

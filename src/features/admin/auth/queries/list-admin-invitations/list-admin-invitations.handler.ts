import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { createPaginatedResponse } from "../../../../../shared/pagination/index.js";
import { requireAdminInvitationManager } from "../../admin-invitation.authorization.js";
import { presentAdminInvitation } from "../../admin-invitation.presenter.js";
import { adminInvitationListSelect } from "../../admin-invitation.select.js";
import type { listAdminInvitationsContract } from "./list-admin-invitations.contract.js";

export function createListAdminInvitationsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listAdminInvitationsContract> {
  return async ({ query, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAdminInvitationManager({
      adminUserId,
      database: dependencies.database
    });

    const search = query.search?.trim();
    const where: Prisma.AdminInvitationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { role: { name: { contains: search, mode: "insensitive" } } },
              {
                invitedByAdmin: {
                  displayName: { contains: search, mode: "insensitive" }
                }
              }
            ]
          }
        : {})
    };

    const [totalItems, invitations] = await dependencies.database.$transaction([
      dependencies.database.adminInvitation.count({ where }),
      dependencies.database.adminInvitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: adminInvitationListSelect
      })
    ]);

    return {
      status: 200,
      body: createPaginatedResponse({
        data: invitations.map(presentAdminInvitation),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems
      })
    };
  };
}

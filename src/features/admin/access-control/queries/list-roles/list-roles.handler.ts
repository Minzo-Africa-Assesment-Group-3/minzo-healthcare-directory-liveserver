import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { requireAccessControlManager } from "../../access-control.authorization.js";
import { presentAdminRole } from "../../access-control.presenter.js";
import type { listAdminRolesContract } from "./list-roles.contract.js";

export function createListAdminRolesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listAdminRolesContract> {
  return async ({ req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAccessControlManager({ adminUserId, database: dependencies.database });

    const roles = await dependencies.database.adminRole.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: {
          select: { permission: { select: { id: true, name: true, description: true } } }
        }
      }
    });

    return { status: 200, body: { data: roles.map(presentAdminRole) } };
  };
}

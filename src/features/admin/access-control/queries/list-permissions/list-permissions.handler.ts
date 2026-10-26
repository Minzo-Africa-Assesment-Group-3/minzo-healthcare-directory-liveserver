import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { requireAccessControlManager } from "../../access-control.authorization.js";
import { presentAdminPermission } from "../../access-control.presenter.js";
import type { listAdminPermissionsContract } from "./list-permissions.contract.js";

export function createListAdminPermissionsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listAdminPermissionsContract> {
  return async ({ req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAccessControlManager({ adminUserId, database: dependencies.database });

    const permissions = await dependencies.database.adminPermission.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true }
    });

    return { status: 200, body: { data: permissions.map(presentAdminPermission) } };
  };
}

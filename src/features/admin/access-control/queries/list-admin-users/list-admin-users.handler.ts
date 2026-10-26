import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { requireAccessControlManager } from "../../access-control.authorization.js";
import { presentAdministratorAccess } from "../../access-control.presenter.js";
import type { listAdministratorsContract } from "./list-admin-users.contract.js";

export function createListAdministratorsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listAdministratorsContract> {
  return async ({ req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAccessControlManager({ adminUserId, database: dependencies.database });

    const administrators = await dependencies.database.adminUser.findMany({
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        displayName: true,
        email: true,
        status: true,
        roles: { select: { role: { select: { id: true, name: true } } } }
      }
    });

    return { status: 200, body: { data: administrators.map(presentAdministratorAccess) } };
  };
}

import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { createCreateAdminRoleHandler } from "./commands/create-role/create-role.handler.js";
import { createAdminRoleContract } from "./commands/create-role/create-role.contract.js";
import { createSyncAdministratorRolesHandler } from "./commands/sync-admin-roles/sync-admin-roles.handler.js";
import { syncAdministratorRolesContract } from "./commands/sync-admin-roles/sync-admin-roles.contract.js";
import { createSyncAdminRolePermissionsHandler } from "./commands/sync-role-permissions/sync-role-permissions.handler.js";
import { syncAdminRolePermissionsContract } from "./commands/sync-role-permissions/sync-role-permissions.contract.js";
import { createListAdministratorsHandler } from "./queries/list-admin-users/list-admin-users.handler.js";
import { listAdministratorsContract } from "./queries/list-admin-users/list-admin-users.contract.js";
import { createListAdminPermissionsHandler } from "./queries/list-permissions/list-permissions.handler.js";
import { listAdminPermissionsContract } from "./queries/list-permissions/list-permissions.contract.js";
import { createListAdminRolesHandler } from "./queries/list-roles/list-roles.handler.js";
import { listAdminRolesContract } from "./queries/list-roles/list-roles.contract.js";

const contract = initContract();

export const adminAccessControlContract = contract.router({
  listRoles: listAdminRolesContract,
  listPermissions: listAdminPermissionsContract,
  createRole: createAdminRoleContract,
  syncRolePermissions: syncAdminRolePermissionsContract,
  listAdministrators: listAdministratorsContract,
  syncAdministratorRoles: syncAdministratorRolesContract
});

export interface AdminAccessControlRouteDependencies {
  database: DatabaseClient;
}

export function createAdminAccessControlHandlers(
  dependencies: AdminAccessControlRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares
) {
  return {
    listRoles: {
      middleware: [authenticateAdmin],
      handler: createListAdminRolesHandler(dependencies)
    },
    listPermissions: {
      middleware: [authenticateAdmin],
      handler: createListAdminPermissionsHandler(dependencies)
    },
    createRole: {
      middleware: [authenticateAdmin],
      handler: createCreateAdminRoleHandler(dependencies)
    },
    syncRolePermissions: {
      middleware: [authenticateAdmin],
      handler: createSyncAdminRolePermissionsHandler(dependencies)
    },
    listAdministrators: {
      middleware: [authenticateAdmin],
      handler: createListAdministratorsHandler(dependencies)
    },
    syncAdministratorRoles: {
      middleware: [authenticateAdmin],
      handler: createSyncAdministratorRolesHandler(dependencies)
    }
  };
}

import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireAccessControlManager } from "../../access-control.authorization.js";
import { presentAdminRole } from "../../access-control.presenter.js";
import type { syncAdminRolePermissionsContract } from "./sync-role-permissions.contract.js";

function roleNotFoundError(): AppError {
  return new AppError({
    code: "admin_role_not_found",
    message: "The selected administrator role does not exist.",
    statusCode: 404,
    title: "Administrator role not found"
  });
}

export function createSyncAdminRolePermissionsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof syncAdminRolePermissionsContract> {
  return async ({ body, params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAccessControlManager({ adminUserId, database: dependencies.database });
    const permissionIds = [...new Set(body.permissionIds)];

    const role = await dependencies.database.$transaction(
      async (transaction) => {
        const existingRole = await transaction.adminRole.findUnique({
          where: { id: params.roleId },
          select: { id: true, name: true }
        });

        if (!existingRole) throw roleNotFoundError();

        if (existingRole.name === "SUPER_ADMIN") {
          throw new AppError({
            code: "system_role_protected",
            message: "The SUPER_ADMIN role is managed by the system and cannot be edited.",
            statusCode: 409,
            title: "System role protected"
          });
        }

        const permissionCount = await transaction.adminPermission.count({
          where: { id: { in: permissionIds } }
        });

        if (permissionCount !== permissionIds.length) {
          throw new AppError({
            code: "admin_permission_not_found",
            message: "One or more selected permissions do not exist.",
            statusCode: 400,
            title: "Administrator permission not found"
          });
        }

        await transaction.adminRolePermission.deleteMany({ where: { roleId: existingRole.id } });

        if (permissionIds.length > 0) {
          await transaction.adminRolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId: existingRole.id, permissionId }))
          });
        }

        const updatedRole = await transaction.adminRole.findUniqueOrThrow({
          where: { id: existingRole.id },
          select: {
            id: true,
            name: true,
            description: true,
            permissions: {
              select: { permission: { select: { id: true, name: true, description: true } } }
            }
          }
        });

        await recordAuditLog(transaction, {
          actor: { type: "ADMIN", adminUserId },
          action: "admin.role.permissions_synced",
          entity: { id: updatedRole.id, type: "ADMIN_ROLE" },
          metadata: { permissionIds }
        });

        return updatedRole;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return { status: 200, body: presentAdminRole(role) };
  };
}

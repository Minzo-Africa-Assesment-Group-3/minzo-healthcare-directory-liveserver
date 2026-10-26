import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireAccessControlManager } from "../../access-control.authorization.js";
import { presentAdministratorAccess } from "../../access-control.presenter.js";
import type { syncAdministratorRolesContract } from "./sync-admin-roles.contract.js";

export function createSyncAdministratorRolesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof syncAdministratorRolesContract> {
  return async ({ body, params, req }) => {
    const actorAdminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAccessControlManager({ adminUserId: actorAdminUserId, database: dependencies.database });
    const roleIds = [...new Set(body.roleIds)];

    const administrator = await dependencies.database.$transaction(
      async (transaction) => {
        const [targetAdmin, assignedRoles] = await Promise.all([
          transaction.adminUser.findUnique({
            where: { id: params.adminUserId },
            select: {
              id: true,
              email: true,
              displayName: true,
              status: true,
              roles: { select: { role: { select: { id: true, name: true } } } }
            }
          }),
          transaction.adminRole.findMany({
            where: { id: { in: roleIds } },
            select: { id: true, name: true }
          })
        ]);

        if (!targetAdmin) {
          throw new AppError({
            code: "administrator_not_found",
            message: "The selected administrator does not exist.",
            statusCode: 404,
            title: "Administrator not found"
          });
        }

        if (assignedRoles.length !== roleIds.length) {
          throw new AppError({
            code: "admin_role_not_found",
            message: "One or more selected administrator roles do not exist.",
            statusCode: 400,
            title: "Administrator role not found"
          });
        }

        const targetIsSuperAdmin = targetAdmin.roles.some(({ role }) => role.name === "SUPER_ADMIN");
        const keepsSuperAdmin = assignedRoles.some((role) => role.name === "SUPER_ADMIN");

        if (targetIsSuperAdmin && !keepsSuperAdmin) {
          const activeSuperAdminCount = await transaction.adminUser.count({
            where: {
              status: "ACTIVE",
              roles: { some: { role: { name: "SUPER_ADMIN" } } }
            }
          });

          if (activeSuperAdminCount <= 1) {
            throw new AppError({
              code: "last_super_admin_protected",
              message: "The last active super administrator must retain the SUPER_ADMIN role.",
              statusCode: 409,
              title: "Last super administrator protected"
            });
          }
        }

        await transaction.adminUserRole.deleteMany({ where: { adminUserId: targetAdmin.id } });
        await transaction.adminUserRole.createMany({
          data: roleIds.map((roleId) => ({ adminUserId: targetAdmin.id, roleId }))
        });

        const updatedAdmin = await transaction.adminUser.findUniqueOrThrow({
          where: { id: targetAdmin.id },
          select: {
            id: true,
            displayName: true,
            email: true,
            status: true,
            roles: { select: { role: { select: { id: true, name: true } } } }
          }
        });

        await recordAuditLog(transaction, {
          actor: { type: "ADMIN", adminUserId: actorAdminUserId },
          action: "admin.user.roles_synced",
          entity: { id: updatedAdmin.id, type: "ADMIN_USER" },
          metadata: { roleIds }
        });

        return updatedAdmin;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return { status: 200, body: presentAdministratorAccess(administrator) };
  };
}

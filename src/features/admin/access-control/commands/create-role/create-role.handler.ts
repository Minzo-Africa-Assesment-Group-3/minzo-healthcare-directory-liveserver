import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireAccessControlManager } from "../../access-control.authorization.js";
import { presentAdminRole } from "../../access-control.presenter.js";
import type { createAdminRoleContract } from "./create-role.contract.js";

function roleAlreadyExistsError(): AppError {
  return new AppError({
    code: "admin_role_already_exists",
    message: "An administrator role with this name already exists.",
    statusCode: 409,
    title: "Administrator role already exists"
  });
}

export function createCreateAdminRoleHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof createAdminRoleContract> {
  return async ({ body, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAccessControlManager({ adminUserId, database: dependencies.database });

    try {
      const role = await dependencies.database.$transaction(async (transaction) => {
        const createdRole = await transaction.adminRole.create({
          data: {
            name: body.name.trim(),
            ...(body.description === undefined ? {} : { description: body.description.trim() })
          },
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
          action: "admin.role.created",
          entity: { id: createdRole.id, type: "ADMIN_ROLE" },
          metadata: { name: createdRole.name }
        });

        return createdRole;
      });

      return { status: 201, body: presentAdminRole(role) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw roleAlreadyExistsError();
      }

      throw error;
    }
  };
}

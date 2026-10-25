import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { requireAdminInvitationManager } from "../../admin-invitation.authorization.js";
import { generateAdminInvitationToken, type AdminAuthEmailService } from "../../services/index.js";
import type { inviteAdminContract } from "./invite-admin.contract.js";

function administratorAlreadyExistsError(): AppError {
  return new AppError({
    code: "admin_already_exists",
    message: "An administrator with this email already exists.",
    statusCode: 409,
    title: "Administrator already exists"
  });
}

export function createInviteAdminHandler(dependencies: {
  adminAuthEmail: AdminAuthEmailService;
  database: DatabaseClient;
  invitationTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof inviteAdminContract> {
  return async ({ body, req }) => {
    const principal = requireAuthenticatedPrincipal(req, "admin");
    await requireAdminInvitationManager({
      adminUserId: principal.subjectId,
      database: dependencies.database
    });

    const email = body.email.trim().toLowerCase();
    const existingAdmin = await dependencies.database.adminUser.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingAdmin) {
      throw administratorAlreadyExistsError();
    }

    const role = await dependencies.database.adminRole.findUnique({
      where: { name: body.roleName.trim() },
      select: { id: true }
    });

    if (!role) {
      throw new AppError({
        code: "admin_role_not_found",
        message: "The selected administrator role does not exist.",
        statusCode: 400,
        title: "Administrator role not found"
      });
    }

    const now = new Date();
    const invitationToken = generateAdminInvitationToken(dependencies.invitationTokenTtlSeconds, now);
    const invitation = await dependencies.database.$transaction(async (transaction) => {
      await transaction.adminInvitation.updateMany({
        where: {
          email,
          status: "PENDING",
          revokedAt: null,
          acceptedAt: null
        },
        data: {
          status: "REVOKED",
          revokedAt: now
        }
      });

      const createdInvitation = await transaction.adminInvitation.create({
        data: {
          id: invitationToken.id,
          displayName: body.displayName.trim(),
          email,
          expiresAt: invitationToken.expiresAt,
          invitedByAdminId: principal.subjectId,
          roleId: role.id,
          tokenHash: invitationToken.tokenHash
        },
        select: {
          id: true,
          expiresAt: true
        }
      });

      await recordAuditLog(transaction, {
        actor: { type: "ADMIN", adminUserId: principal.subjectId },
        action: "admin.invited",
        entity: { id: createdInvitation.id, type: "ADMIN_INVITATION" },
        metadata: {
          email,
          roleName: body.roleName.trim()
        }
      });

      return createdInvitation;
    });

    try {
      await dependencies.adminAuthEmail.sendInvitation({
        displayName: body.displayName.trim(),
        email,
        invitationId: invitation.id,
        token: invitationToken.token
      });
    } catch (cause) {
      throw new AppError({
        cause,
        code: "admin_invitation_unavailable",
        message: "The administrator invitation could not be sent. Try again later.",
        statusCode: 503,
        title: "Administrator invitation unavailable"
      });
    }

    return {
      status: 201,
      body: {
        expiresAt: invitation.expiresAt.toISOString(),
        id: invitation.id,
        message: "Administrator invitation sent."
      }
    };
  };
}

import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { requireAdminInvitationManager } from "../../admin-invitation.authorization.js";
import type { revokeAdminInvitationContract } from "./revoke-admin-invitation.contract.js";

export function createRevokeAdminInvitationHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof revokeAdminInvitationContract> {
  return async ({ params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireAdminInvitationManager({
      adminUserId,
      database: dependencies.database
    });

    const revokedInvitation = await dependencies.database.$transaction(async (transaction) => {
      const invitation = await transaction.adminInvitation.findUnique({
        where: { id: params.invitationId },
        select: { id: true, email: true, status: true, acceptedAt: true, revokedAt: true }
      });

      if (!invitation) {
        throw new AppError({
          code: "admin_invitation_not_found",
          message: "The administrator invitation was not found.",
          statusCode: 404,
          title: "Administrator invitation not found"
        });
      }

      const now = new Date();
      const result = await transaction.adminInvitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
          acceptedAt: null,
          revokedAt: null
        },
        data: {
          status: "REVOKED",
          revokedAt: now
        }
      });

      if (result.count !== 1) {
        throw new AppError({
          code: "admin_invitation_cannot_be_revoked",
          message: "Only a pending administrator invitation can be revoked.",
          statusCode: 409,
          title: "Administrator invitation cannot be revoked"
        });
      }

      await recordAuditLog(transaction, {
        actor: { type: "ADMIN", adminUserId },
        action: "admin.invitation.revoked",
        entity: { id: invitation.id, type: "ADMIN_INVITATION" },
        metadata: { email: invitation.email }
      });

      return { id: invitation.id, revokedAt: now };
    });

    return {
      status: 200,
      body: {
        id: revokedInvitation.id,
        status: "REVOKED",
        revokedAt: revokedInvitation.revokedAt.toISOString()
      }
    };
  };
}

import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { hashPassword } from "../../../../../shared/authentication/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { hashAdminInvitationToken } from "../../services/index.js";
import type { acceptAdminInvitationContract } from "./accept-admin-invitation.contract.js";

function invalidInvitationError(): AppError {
  return new AppError({
    code: "invalid_admin_invitation",
    message: "The administrator invitation is invalid or has already been used.",
    statusCode: 400,
    title: "Invalid administrator invitation"
  });
}

export function createAcceptAdminInvitationHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof acceptAdminInvitationContract> {
  return async ({ body }) => {
    const invitation = await dependencies.database.adminInvitation.findUnique({
      where: { tokenHash: hashAdminInvitationToken(body.token) },
      select: {
        id: true,
        displayName: true,
        email: true,
        expiresAt: true,
        status: true,
        acceptedAt: true,
        revokedAt: true,
        role: {
          select: { id: true, name: true }
        }
      }
    });

    if (!invitation || invitation.status !== "PENDING" || invitation.acceptedAt || invitation.revokedAt) {
      throw invalidInvitationError();
    }

    const now = new Date();

    if (invitation.expiresAt <= now) {
      throw new AppError({
        code: "admin_invitation_expired",
        message: "The administrator invitation has expired. Request a new invitation.",
        statusCode: 410,
        title: "Administrator invitation expired"
      });
    }

    const passwordHash = await hashPassword(body.password);

    try {
      const admin = await dependencies.database.$transaction(async (transaction) => {
        const acceptedInvitation = await transaction.adminInvitation.updateMany({
          where: {
            id: invitation.id,
            status: "PENDING",
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now }
          },
          data: {
            status: "ACCEPTED",
            acceptedAt: now
          }
        });

        if (acceptedInvitation.count !== 1) {
          throw invalidInvitationError();
        }

        const createdAdmin = await transaction.adminUser.create({
          data: {
            displayName: invitation.displayName,
            email: invitation.email,
            emailVerifiedAt: now,
            passwordHash,
            roles: {
              create: { roleId: invitation.role.id }
            }
          },
          select: {
            displayName: true,
            email: true,
            id: true
          }
        });

        await recordAuditLog(transaction, {
          actor: { type: "AUTOMATION", actorReference: "admin-invitation-acceptance" },
          action: "admin.invitation.accepted",
          entity: { id: createdAdmin.id, type: "ADMIN_USER" },
          metadata: {
            invitationId: invitation.id,
            roleName: invitation.role.name
          }
        });

        return createdAdmin;
      });

      return {
        status: 201,
        body: {
          admin: {
            ...admin,
            roles: [invitation.role.name]
          },
          message: "Administrator account created. You can now sign in."
        }
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError({
        cause: error,
        code: "admin_invitation_acceptance_failed",
        message: "The administrator account could not be created. Request a new invitation.",
        statusCode: 409,
        title: "Administrator account could not be created"
      });
    }
  };
}

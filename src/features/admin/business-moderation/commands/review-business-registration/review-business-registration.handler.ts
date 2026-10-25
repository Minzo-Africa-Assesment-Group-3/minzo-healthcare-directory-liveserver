import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireBusinessModerationAdmin } from "../../business-moderation.authorization.js";
import type { reviewBusinessRegistrationContract } from "./review-business-registration.contract.js";

function reviewConflictError(message: string): AppError {
  return new AppError({
    code: "business_registration_review_conflict",
    message,
    statusCode: 409,
    title: "Business registration review conflict"
  });
}

export function createReviewBusinessRegistrationHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof reviewBusinessRegistrationContract> {
  return async ({ body, params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireBusinessModerationAdmin({
      adminUserId,
      database: dependencies.database
    });
    const reviewedAt = new Date();

    try {
      const result = await dependencies.database.$transaction(
        async (transaction) => {
          const business = await transaction.business.findFirst({
            where: {
              id: params.businessId,
              source: "SELF_REGISTERED"
            },
            select: {
              id: true,
              status: true,
              registrationDocumentKey: true,
              memberships: {
                where: {
                  user: {
                    status: "ACTIVE",
                    deletedAt: null
                  }
                },
                select: { userId: true },
                take: 1
              },
              registrationDocuments: {
                where: { status: "ATTACHED" },
                select: { id: true },
                take: 1
              }
            }
          });

          if (!business) {
            throw new AppError({
              code: "business_registration_not_found",
              message: "The requested business registration does not exist.",
              statusCode: 404,
              title: "Business registration not found"
            });
          }

          if (business.status !== "PENDING_APPROVAL") {
            throw reviewConflictError("This business registration has already been reviewed.");
          }

          if (
            body.decision === "APPROVED" &&
            (!business.registrationDocumentKey || business.registrationDocuments.length === 0)
          ) {
            throw reviewConflictError("A verified registration document is required before approval.");
          }

          if (body.decision === "APPROVED" && business.memberships.length === 0) {
            throw reviewConflictError(
              "At least one active, email-verified business member is required before approval."
            );
          }

          const approved = body.decision === "APPROVED";
          const updated = await transaction.business.updateMany({
            where: {
              id: business.id,
              source: "SELF_REGISTERED",
              status: "PENDING_APPROVAL"
            },
            data: approved
              ? {
                  status: "APPROVED",
                  verificationStatus: "VERIFIED",
                  approvedAt: reviewedAt,
                  rejectedAt: null,
                  verifiedAt: reviewedAt,
                  verifiedByAdminId: adminUserId,
                  reviewedAt,
                  reviewedByAdminId: adminUserId,
                  reviewNote: body.reviewNote?.trim() ?? null
                }
              : {
                  status: "REJECTED",
                  verificationStatus: "UNVERIFIED",
                  approvedAt: null,
                  rejectedAt: reviewedAt,
                  verifiedAt: null,
                  verifiedByAdminId: null,
                  reviewedAt,
                  reviewedByAdminId: adminUserId,
                  reviewNote: body.reviewNote.trim()
                }
          });

          if (updated.count !== 1) {
            throw reviewConflictError("The business registration changed while it was being reviewed.");
          }

          const activatedLocations = approved
            ? await transaction.businessLocation.updateMany({
                where: { businessId: business.id, status: "DRAFT" },
                data: { status: "ACTIVE" }
              })
            : { count: 0 };

          await recordAuditLog(transaction, {
            actor: { type: "ADMIN", adminUserId },
            action: approved ? "business.registration.approved" : "business.registration.rejected",
            entity: { id: business.id, type: "BUSINESS" },
            metadata: {
              activatedLocationCount: activatedLocations.count,
              decision: body.decision,
              reviewNote: body.reviewNote?.trim() ?? null,
              verificationStatus: approved ? "VERIFIED" : "UNVERIFIED"
            }
          });

          return {
            businessId: business.id,
            status: body.decision,
            verificationStatus: approved ? ("VERIFIED" as const) : ("UNVERIFIED" as const),
            reviewedByAdminId: adminUserId,
            reviewedAt: reviewedAt.toISOString(),
            reviewNote: body.reviewNote?.trim() ?? null,
            activatedLocationCount: activatedLocations.count
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return { status: 200, body: result };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw reviewConflictError("The business registration changed while it was being reviewed.");
      }

      throw error;
    }
  };
}

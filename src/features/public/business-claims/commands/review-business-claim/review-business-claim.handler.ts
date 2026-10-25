import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../../admin/audit-logs/record-audit-log.js";
import { requireBusinessClaimsAdmin } from "../../business-claim.authorization.js";
import { presentAdminBusinessClaim } from "../../business-claim.presenter.js";
import { adminBusinessClaimSelect } from "../../business-claim.select.js";
import type { reviewBusinessClaimContract } from "./review-business-claim.contract.js";

function claimStateConflictError(): AppError {
  return new AppError({
    code: "business_claim_state_conflict",
    message: "The business claim is no longer available for this decision.",
    statusCode: 409,
    title: "Business claim state conflict"
  });
}

export function createReviewBusinessClaimHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof reviewBusinessClaimContract> {
  return async ({ body, params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    const reviewedByAdminId = await requireBusinessClaimsAdmin({
      adminUserId,
      database: dependencies.database
    });
    const reviewedAt = new Date();

    try {
      const reviewedClaim = await dependencies.database.$transaction(
        async (transaction) => {
          const claim = await transaction.businessClaim.findUnique({
            where: { id: params.claimId },
            select: {
              id: true,
              businessId: true,
              claimantUserId: true,
              requestedRole: true,
              status: true,
              business: {
                select: {
                  status: true,
                  _count: {
                    select: { memberships: true }
                  }
                }
              }
            }
          });

          if (!claim) {
            throw new AppError({
              code: "business_claim_not_found",
              message: "The requested business claim does not exist.",
              statusCode: 404,
              title: "Business claim not found"
            });
          }

          if (claim.status !== "PENDING") {
            throw claimStateConflictError();
          }

          if (body.decision === "APPROVED") {
            if (claim.business.status !== "APPROVED" || claim.business._count.memberships > 0) {
              throw claimStateConflictError();
            }

            await transaction.businessMembership.upsert({
              where: {
                userId_businessId: {
                  userId: claim.claimantUserId,
                  businessId: claim.businessId
                }
              },
              update: { role: claim.requestedRole },
              create: {
                userId: claim.claimantUserId,
                businessId: claim.businessId,
                role: claim.requestedRole
              }
            });

            await transaction.business.update({
              where: { id: claim.businessId },
              data: {
                verificationStatus: "VERIFIED",
                verifiedAt: reviewedAt,
                verifiedByAdminId: reviewedByAdminId
              }
            });

            await transaction.businessClaim.updateMany({
              where: {
                businessId: claim.businessId,
                id: { not: claim.id },
                status: "PENDING"
              },
              data: {
                status: "REJECTED",
                reviewedAt,
                reviewedByAdminId,
                reviewNote: "Another ownership claim for this business was approved."
              }
            });
          }

          const reviewedClaim = await transaction.businessClaim.update({
            where: { id: claim.id },
            data: {
              status: body.decision,
              reviewedAt,
              reviewedByAdminId,
              reviewNote: body.reviewNote?.trim() ?? null
            },
            select: adminBusinessClaimSelect
          });

          await recordAuditLog(transaction, {
            actor: { type: "ADMIN", adminUserId: reviewedByAdminId },
            action: body.decision === "APPROVED" ? "business.claim.approved" : "business.claim.rejected",
            entity: { id: claim.id, type: "BUSINESS_CLAIM" },
            metadata: {
              businessId: claim.businessId,
              decision: body.decision,
              requestedRole: claim.requestedRole,
              reviewNote: body.reviewNote?.trim() ?? null
            }
          });

          return reviewedClaim;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );

      return {
        status: 200,
        body: presentAdminBusinessClaim(reviewedClaim)
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw claimStateConflictError();
      }

      throw error;
    }
  };
}

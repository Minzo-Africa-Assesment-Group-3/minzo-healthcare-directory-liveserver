import type { AppRouteQueryImplementation } from "@ts-rest/express";
import type { DatabaseClient } from "../../../../infrastructure/database/database.js";
import type { getMyProfileContract } from "./get-my-profile.contract.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../shared/errors/app-error.js";

export function createGetMyProfileHandler({ database }: { database: DatabaseClient; }):
    AppRouteQueryImplementation<typeof getMyProfileContract> {
    return async ({ req, res }) => {
        res.setHeader("Cache-Control", "no-store");
        const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
        const user = await database.user.findUnique({
          where: { id: userId, status: "ACTIVE", deletedAt: null },
          select: {
            id: true, displayName: true, email: true, phone: true, status: true,
            emailVerifiedAt: true, createdAt: true,
          },
        });
        if (!user) {
          throw new AppError({
            code: "account_unavailable", message: "The authenticated account is not available.",
            statusCode: 403, title: "Account unavailable",
          });
        }
        return {
          status: 200,
          body: {
            ...user,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
            createdAt: user.createdAt.toISOString(),
          },
        };
    };

}


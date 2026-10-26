import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireDirectoryManager } from "../../directory-management.authorization.js";
import { createDirectorySlug, normalizeDirectoryName } from "../../directory-slug.js";
import type { createCountyContract } from "./create-county.contract.js";

export function createCreateCountyHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof createCountyContract> {
  return async ({ body, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireDirectoryManager({ adminUserId, database: dependencies.database });
    const name = normalizeDirectoryName(body.name);

    try {
      const county = await dependencies.database.$transaction(async (transaction) => {
        const createdCounty = await transaction.county.create({
          data: { name, slug: createDirectorySlug(name) },
          select: { id: true, name: true, slug: true, isActive: true }
        });

        await recordAuditLog(transaction, {
          actor: { type: "ADMIN", adminUserId },
          action: "directory.county.created",
          entity: { id: createdCounty.id, type: "COUNTY" },
          metadata: { name: createdCounty.name }
        });

        return createdCounty;
      });

      return { status: 201, body: county };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError({
          code: "county_already_exists",
          message: "A county with this name already exists.",
          statusCode: 409,
          title: "County already exists"
        });
      }

      throw error;
    }
  };
}

import { Router } from "express";
import { generateOpenApi } from "@ts-rest/open-api";
import swaggerUi from "swagger-ui-express";

import { applicationContract } from "../../routes.js";
import { getRouteAuthenticationStrategy } from "../../shared/authentication/index.js";

const openApiDocument = generateOpenApi(
  applicationContract,
  {
    info: {
      title: "Minzo Express API",
      version: "1.0.0",
      description:
        "API documentation for the Minzo Express boilerplate.",
    },
    components: {
      securitySchemes: {
        AdminBearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        AdminRefreshToken: {
          type: "apiKey",
          in: "cookie",
          name: "admin_refresh_token",
        },
        UserBearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        UserRefreshToken: {
          type: "apiKey",
          in: "cookie",
          name: "refresh_token",
        },
      },
    },
    tags: [
      {
        name: "Admin Authentication",
        description:
          "Minzo staff login and administrator session endpoints.",
      },
      {
        name: "Authentication",
        description: "User registration, email verification, and sign-in endpoints.",
      },
      {
        name: "Business Claims",
        description:
          "Public-user workflows for claiming imported business listings.",
      },
      {
        name: "Business Contact Messages",
        description:
          "Customer enquiries and authenticated owner or manager inbox endpoints.",
      },
      {
        name: "Businesses",
        description:
          "Business profile and location management endpoints.",
      },
      {
        name: "Business Media",
        description:
          "Business gallery upload, ordering, cover selection, and removal endpoints.",
      },
      {
        name: "Admin Business Media",
        description:
          "Minzo administrator moderation of business gallery submissions.",
      },
      {
        name: "Admin Businesses",
        description:
          "Minzo administrator review and approval of business registrations.",
      },
      {
        name: "Cities",
        description:
          "Public city and town catalogue discovery endpoints.",
      },
      {
        name: "Counties",
        description:
          "Public Liberian county catalogue discovery endpoints.",
      },
      {
        name: "Admin Business Claims",
        description:
          "Minzo administrator review and approval of business claims.",
      },
      {
        name: "System",
        description: "Application health and system endpoints.",
      },
      {
        name: "Services",
        description:
          "Public service-catalogue discovery endpoints.",
      },
      {
        name: "Customer Reviews",
        description:
          "Customer ratings, written feedback, anonymity, and public business rating summaries.",
      },
      {
        name: "Business Customer Reviews",
        description:
          "Authenticated owner and manager access to their business review dashboard.",
      },
      {
        name: "Admin Customer Reviews",
        description:
          "Human moderation of published customer reviews and reviews escalated by future automation.",
      },
    ],
  },
  {
    setOperationId: "concatenated-path",
    operationMapper: (operation, appRoute) => {
      const metadata = appRoute.metadata;
      const authentication = getRouteAuthenticationStrategy(metadata);

      if (
        typeof metadata === "object" &&
        metadata !== null &&
        "openApiTags" in metadata &&
        Array.isArray(metadata.openApiTags)
      ) {
        const mappedOperation = {
          ...operation,
          tags: metadata.openApiTags.filter(
            (tag): tag is string => typeof tag === "string",
          ),
        };

        if (authentication === "admin-access-token") {
          return {
            ...mappedOperation,
            security: [{ AdminBearerAuth: [] }],
          };
        }

        if (authentication === "user-access-token") {
          return {
            ...mappedOperation,
            security: [{ UserBearerAuth: [] }],
          };
        }

        if (authentication === "optional-user-access-token") {
          return {
            ...mappedOperation,
            security: [{}, { UserBearerAuth: [] }],
          };
        }

        if (authentication === "admin-refresh-token") {
          return {
            ...mappedOperation,
            security: [{ AdminRefreshToken: [] }],
          };
        }

        if (authentication === "user-refresh-token") {
          return {
            ...mappedOperation,
            security: [{ UserRefreshToken: [] }],
          };
        }

        return mappedOperation;
      }

      return operation;
    },
  },
);

export const openApiRouter = Router();

openApiRouter.get("/openapi.json", (_request, response) => {
  response.json(openApiDocument);
});

openApiRouter.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true,
  }),
);

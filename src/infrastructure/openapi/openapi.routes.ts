import { Router } from "express";
import { generateOpenApi } from "@ts-rest/open-api";
import swaggerUi from "swagger-ui-express";

import { applicationContract } from "../../routes.js";

function getOperationSecurity(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null || !("authentication" in metadata)) {
    return undefined;
  }

  switch (metadata.authentication) {
    case "admin-access-token":
      return [{ adminBearerAuth: [] }];
    case "optional-user-access-token":
      return [{}, { userBearerAuth: [] }];
    case "user-access-token":
      return [{ userBearerAuth: [] }];
    default:
      return undefined;
  }
}

const openApiDocument = generateOpenApi(
  applicationContract,
  {
    info: {
      title: "Minzo Health Directory API",
      version: "1.0.0",
      description: "API documentation for the Minzo Health Directory."
    },
    tags: [
      {
        name: "Authentication",
        description: "Individual and business account registration and sign-in endpoints."
      },
      {
        name: "System",
        description: "Application health and system endpoints."
      }
    ],
    components: {
      securitySchemes: {
        adminBearerAuth: {
          bearerFormat: "JWT",
          description: "Paste an administrator access token. Swagger adds the Bearer prefix.",
          scheme: "bearer",
          type: "http"
        },
        userBearerAuth: {
          bearerFormat: "JWT",
          description: "Paste a user access token. Swagger adds the Bearer prefix.",
          scheme: "bearer",
          type: "http"
        }
      }
    }
  },
  {
    setOperationId: "concatenated-path",
    operationMapper: (operation, appRoute) => {
      const metadata = appRoute.metadata;
      const security = getOperationSecurity(metadata);
      const mappedOperation = security ? { ...operation, security } : { ...operation };

      if (
        typeof metadata === "object" &&
        metadata !== null &&
        "openApiTags" in metadata &&
        Array.isArray(metadata.openApiTags)
      ) {
        return {
          ...mappedOperation,
          tags: metadata.openApiTags.filter((tag): tag is string => typeof tag === "string")
        };
      }

      return mappedOperation;
    }
  }
);

export const openApiRouter = Router();

openApiRouter.get("/openapi.json", (_request, response) => {
  response.json(openApiDocument);
});

openApiRouter.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true
  })
);

import { Router } from "express";
import { generateOpenApi } from "@ts-rest/open-api";
import swaggerUi from "swagger-ui-express";

import { applicationContract } from "../../routes.js";

const openApiDocument = generateOpenApi(
  applicationContract,
  {
    info: {
      title: "Minzo Health Directory API",
      version: "1.0.0",
      description:
        "API documentation for the Minzo Health Directory.",
    },
    tags: [
      {
        name: "Authentication",
        description: "Individual and business account registration and sign-in endpoints.",
      },
      {
        name: "System",
        description: "Application health and system endpoints.",
      },
    ],
  },
  {
    setOperationId: "concatenated-path",
    operationMapper: (operation, appRoute) => {
      const metadata = appRoute.metadata;

      if (
        typeof metadata === "object" &&
        metadata !== null &&
        "openApiTags" in metadata &&
        Array.isArray(metadata.openApiTags)
      ) {
        return {
          ...operation,
          tags: metadata.openApiTags.filter(
            (tag): tag is string => typeof tag === "string",
          ),
        };
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

import { initContract } from "@ts-rest/core";
import {
  createExpressEndpoints,
  initServer,
  type RequestValidationError,
} from "@ts-rest/express";
import type { Express } from "express";

import {
  authPublicContract,
  createAuthPublicHandlers,
  type AuthPublicRouteDependencies,
} from "./features/auth-public/routes.js";
import {
  systemContract,
  systemHandlers,
} from "./features/system/routes.js";
import { sendProblemDetails } from "./shared/errors/problem-details.js";
import type { RateLimitMiddlewares } from "./shared/middleware/rate-limit.middleware.js";
import { createBusinessRegistrationDocumentsHandlers, businessRegistrationDocumentsContract, type BusinessRegistrationDocumentsRouteDependencies } from "./features/business-registration-documents/routes.js";
import { createAuthenticationMiddlewares, type AuthenticationMiddlewareDependencies } from "./shared/authentication/authentication.middleware.js";
import {
  citiesContract,
  createCitiesHandlers,
  type CitiesRouteDependencies,
} from "./features/cities/routes.js";
import {
  countiesContract,
  createCountiesHandlers,
  type CountiesRouteDependencies,
} from "./features/counties/routes.js";
import {
  createCustomerFeedbackModerationHandlers,
  customerFeedbackModerationContract,
  type CustomerFeedbackModerationRouteDependencies,
} from "./features/customer-feedback-moderation/routes.js";
import {
  createReviewsHandlers,
  reviewsContract,
  type ReviewsRouteDependencies,
} from "./features/reviews copy/routes.js";
import { businessesContract, createBusinessesHandlers,type BusinessesRouteDependencies } from "./features/businesses/routes.js";

const contract = initContract();
const server = initServer();

export const applicationContract = contract.router({
  authPublic: authPublicContract,
  system: systemContract,
  businessRegistrationDocuments: businessRegistrationDocumentsContract,
  cities: citiesContract,
  counties: countiesContract,
  reviewModeration: customerFeedbackModerationContract,
  reviews: reviewsContract,
  businesses: businessesContract,
});

export interface ApplicationRouteDependencies {
  authPublic: AuthPublicRouteDependencies;
  rateLimiters: RateLimitMiddlewares;
  businessRegistrationDocuments: BusinessRegistrationDocumentsRouteDependencies;
  authentication: AuthenticationMiddlewareDependencies;
  cities: CitiesRouteDependencies;
  counties: CountiesRouteDependencies;
  reviewModeration: CustomerFeedbackModerationRouteDependencies;
  reviews: ReviewsRouteDependencies;
  businesses: BusinessesRouteDependencies;
}

function getValidationIssues(error: RequestValidationError) {
  return {
    body: error.body?.issues ?? null,
    headers: error.headers?.issues ?? null,
    pathParameters: error.pathParams?.issues ?? null,
    query: error.query?.issues ?? null,
  };
}

export function registerApplicationRoutes(
  app: Express,
  dependencies: ApplicationRouteDependencies,
): void {
  const authentication = createAuthenticationMiddlewares(
    dependencies.authentication,
  );
  const applicationRouter = server.router(
    applicationContract,
    {
      authPublic: createAuthPublicHandlers(
        dependencies.authPublic,
        dependencies.rateLimiters.authPublic,
      ),
      system: systemHandlers,
      businessRegistrationDocuments:
        createBusinessRegistrationDocumentsHandlers(
          dependencies.businessRegistrationDocuments,
          authentication,
        ),
      counties: createCountiesHandlers(dependencies.counties),
      cities: createCitiesHandlers(dependencies.cities),
      reviewModeration:
        createCustomerFeedbackModerationHandlers(
          dependencies.reviewModeration,
          authentication,
        ),
      reviews: createReviewsHandlers(
        dependencies.reviews,
        authentication,
        dependencies.rateLimiters.reviews,
      ),
      businesses: createBusinessesHandlers(
        dependencies.businesses,
        authentication,
      ),
    },
  );

  createExpressEndpoints(
    applicationContract,
    applicationRouter,
    app,
    {
      logInitialization: false,
      responseValidation: true,
      requestValidationErrorHandler: (
        error,
        request,
        response,
      ) => {
        sendProblemDetails(request, response, {
          code: "request_validation_failed",
          detail: "The request did not satisfy the API contract.",
          extensions: {
            errors: getValidationIssues(error),
          },
          statusCode: 400,
          title: "Request validation failed",
        });
      },
    },
  );
}

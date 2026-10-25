import { initContract } from "@ts-rest/core";
import { createExpressEndpoints, initServer, type RequestValidationError } from "@ts-rest/express";
import type { Express } from "express";

import {
  authPublicContract,
  createAuthPublicHandlers,
  type AuthPublicRouteDependencies
} from "./features/public/auth/routes.js";
import {
  authAdminContract,
  createAuthAdminHandlers,
  type AuthAdminRouteDependencies
} from "./features/admin/auth/routes.js";
import {
  adminDashboardContract,
  createAdminDashboardHandlers,
  type AdminDashboardRouteDependencies
} from "./features/admin/dashboard/routes.js";
import { systemContract, systemHandlers } from "./features/system/routes.js";
import { sendProblemDetails } from "./shared/errors/problem-details.js";
import {
  createBusinessRegistrationDocumentsHandlers,
  businessRegistrationDocumentsContract,
  type BusinessRegistrationDocumentsRouteDependencies
} from "./features/business/registration-documents/routes.js";
import {
  createAuthenticationMiddlewares,
  type AuthenticationMiddlewareDependencies
} from "./shared/authentication/authentication.middleware.js";
import {
  citiesContract,
  createCitiesHandlers,
  type CitiesRouteDependencies
} from "./features/public/directory/cities/routes.js";
import {
  countiesContract,
  createCountiesHandlers,
  type CountiesRouteDependencies
} from "./features/public/directory/counties/routes.js";
import {
  createCustomerFeedbackModerationHandlers,
  customerFeedbackModerationContract,
  type CustomerFeedbackModerationRouteDependencies
} from "./features/admin/customer-reviews/routes.js";
import {
  createReviewsHandlers,
  reviewsContract,
  type ReviewsRouteDependencies
} from "./features/shared/reviews/routes.js";
import {
  businessesContract,
  createBusinessesHandlers,
  type BusinessesRouteDependencies
} from "./features/shared/businesses/routes.js";
import {
  businessClaimsContract,
  createBusinessClaimsHandlers,
  type BusinessClaimsRouteDependencies
} from "./features/public/business-claims/routes.js";
import {
  createCurrentUserHandlers,
  currentUserContract,
  type CurrentUserRouteDependencies
} from "./features/public/account/routes.js";

const contract = initContract();
const server = initServer();

export const applicationContract = contract.router({
  adminDashboard: adminDashboardContract,
  authAdmin: authAdminContract,
  authPublic: authPublicContract,
  system: systemContract,
  businessRegistrationDocuments: businessRegistrationDocumentsContract,
  cities: citiesContract,
  counties: countiesContract,
  reviewModeration: customerFeedbackModerationContract,
  reviews: reviewsContract,
  businesses: businessesContract,
  businessClaims: businessClaimsContract,
  currentUser: currentUserContract
});

export interface ApplicationRouteDependencies {
  adminDashboard: AdminDashboardRouteDependencies;
  authAdmin: AuthAdminRouteDependencies;
  authPublic: AuthPublicRouteDependencies;
  businessRegistrationDocuments: BusinessRegistrationDocumentsRouteDependencies;
  authentication: AuthenticationMiddlewareDependencies;
  cities: CitiesRouteDependencies;
  counties: CountiesRouteDependencies;
  reviewModeration: CustomerFeedbackModerationRouteDependencies;
  reviews: ReviewsRouteDependencies;
  businesses: BusinessesRouteDependencies;
  businessClaims: BusinessClaimsRouteDependencies;
  currentUser: CurrentUserRouteDependencies;
}

function getValidationIssues(error: RequestValidationError) {
  return {
    body: error.body?.issues ?? null,
    headers: error.headers?.issues ?? null,
    pathParameters: error.pathParams?.issues ?? null,
    query: error.query?.issues ?? null
  };
}

export function registerApplicationRoutes(app: Express, dependencies: ApplicationRouteDependencies): void {
  const authentication = createAuthenticationMiddlewares(dependencies.authentication);
  const applicationRouter = server.router(applicationContract, {
    adminDashboard: createAdminDashboardHandlers(dependencies.adminDashboard, authentication),
    authAdmin: createAuthAdminHandlers(dependencies.authAdmin, authentication),
    authPublic: createAuthPublicHandlers(dependencies.authPublic),
    system: systemHandlers,
    businessRegistrationDocuments: createBusinessRegistrationDocumentsHandlers(
      dependencies.businessRegistrationDocuments,
      authentication
    ),
    counties: createCountiesHandlers(dependencies.counties),
    cities: createCitiesHandlers(dependencies.cities),
    reviewModeration: createCustomerFeedbackModerationHandlers(dependencies.reviewModeration, authentication),
    reviews: createReviewsHandlers(dependencies.reviews, authentication),
    businesses: createBusinessesHandlers(dependencies.businesses, authentication),
    businessClaims: createBusinessClaimsHandlers(dependencies.businessClaims, authentication),
    currentUser: createCurrentUserHandlers(dependencies.currentUser, authentication)
  });

  createExpressEndpoints(applicationContract, applicationRouter, app, {
    logInitialization: false,
    responseValidation: true,
    requestValidationErrorHandler: (error, request, response) => {
      sendProblemDetails(request, response, {
        code: "request_validation_failed",
        detail: "The request did not satisfy the API contract.",
        extensions: {
          errors: getValidationIssues(error)
        },
        statusCode: 400,
        title: "Request validation failed"
      });
    }
  });
}

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
import {
  adminAccessControlContract,
  createAdminAccessControlHandlers,
  type AdminAccessControlRouteDependencies
} from "./features/admin/access-control/routes.js";
import {
  adminDirectoryManagementContract,
  createAdminDirectoryManagementHandlers,
  type AdminDirectoryManagementRouteDependencies
} from "./features/admin/directory-management/routes.js";
import {
  auditLogsContract,
  createAuditLogsHandlers,
  type AuditLogsRouteDependencies
} from "./features/admin/audit-logs/routes.js";
import {
  businessModerationContract,
  createBusinessModerationHandlers,
  type BusinessModerationRouteDependencies
} from "./features/admin/business-moderation/routes.js";
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
import {
  assistantContract,
  createAssistantHandlers,
  type AssistantRouteDependencies
} from "./features/public/assistant/routes.js";
import {
  businessFollowsContract,
  createBusinessFollowsHandlers,
  type BusinessFollowsRouteDependencies
} from "./features/public/business-follows/routes.js";
import {
  createServicesHandlers,
  servicesContract,
  type ServicesRouteDependencies
} from "./features/public/directory/services/routes.js";

const contract = initContract();
const server = initServer();

export const applicationContract = contract.router({
  adminAccessControl: adminAccessControlContract,
  adminDashboard: adminDashboardContract,
  adminDirectoryManagement: adminDirectoryManagementContract,
  auditLogs: auditLogsContract,
  authAdmin: authAdminContract,
  authPublic: authPublicContract,
  system: systemContract,
  businessModeration: businessModerationContract,
  businessRegistrationDocuments: businessRegistrationDocumentsContract,
  cities: citiesContract,
  counties: countiesContract,
  reviewModeration: customerFeedbackModerationContract,
  reviews: reviewsContract,
  businesses: businessesContract,
  businessClaims: businessClaimsContract,
  businessFollows: businessFollowsContract,
  currentUser: currentUserContract,
  assistant: assistantContract,
  services: servicesContract
});

export interface ApplicationRouteDependencies {
  adminAccessControl: AdminAccessControlRouteDependencies;
  adminDashboard: AdminDashboardRouteDependencies;
  adminDirectoryManagement: AdminDirectoryManagementRouteDependencies;
  assistant: AssistantRouteDependencies;
  auditLogs: AuditLogsRouteDependencies;
  authAdmin: AuthAdminRouteDependencies;
  authPublic: AuthPublicRouteDependencies;
  businessFollows: BusinessFollowsRouteDependencies;
  businessModeration: BusinessModerationRouteDependencies;
  businessRegistrationDocuments: BusinessRegistrationDocumentsRouteDependencies;
  authentication: AuthenticationMiddlewareDependencies;
  cities: CitiesRouteDependencies;
  counties: CountiesRouteDependencies;
  reviewModeration: CustomerFeedbackModerationRouteDependencies;
  reviews: ReviewsRouteDependencies;
  businesses: BusinessesRouteDependencies;
  businessClaims: BusinessClaimsRouteDependencies;
  currentUser: CurrentUserRouteDependencies;
  services: ServicesRouteDependencies;
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
    adminAccessControl: createAdminAccessControlHandlers(dependencies.adminAccessControl, authentication),
    adminDashboard: createAdminDashboardHandlers(dependencies.adminDashboard, authentication),
    adminDirectoryManagement: createAdminDirectoryManagementHandlers(
      dependencies.adminDirectoryManagement,
      authentication
    ),
    auditLogs: createAuditLogsHandlers(dependencies.auditLogs, authentication),
    authAdmin: createAuthAdminHandlers(dependencies.authAdmin, authentication),
    authPublic: createAuthPublicHandlers(dependencies.authPublic),
    system: systemHandlers,
    businessModeration: createBusinessModerationHandlers(dependencies.businessModeration, authentication),
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
    businessFollows: createBusinessFollowsHandlers(dependencies.businessFollows, authentication),
    currentUser: createCurrentUserHandlers(dependencies.currentUser, authentication),
    assistant: createAssistantHandlers(dependencies.assistant, authentication),
    services: createServicesHandlers(dependencies.services)
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

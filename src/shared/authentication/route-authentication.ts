import { AppError } from "../errors/app-error.js";
import type {
  AuthenticationRealm,
  VerifiedAccessToken,
} from "./access-token.js";

export const routeAuthenticationStrategies = [
  "public",
  "optional-user-access-token",
  "user-access-token",
  "admin-access-token",
  "user-refresh-token",
  "admin-refresh-token",
] as const;

export type RouteAuthenticationStrategy =
  (typeof routeAuthenticationStrategies)[number];

export interface RouteMetadata {
  authentication: RouteAuthenticationStrategy;
  openApiTags: string[];
}

interface AuthenticatedRequest {
  auth?: VerifiedAccessToken;
}

export function getRouteAuthenticationStrategy(
  metadata: unknown,
): RouteAuthenticationStrategy {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("authentication" in metadata) ||
    !routeAuthenticationStrategies.includes(
      metadata.authentication as RouteAuthenticationStrategy,
    )
  ) {
    throw new AppError({
      code: "route_authentication_not_configured",
      message: "The route does not declare a valid authentication strategy.",
      statusCode: 500,
      title: "Route authentication is not configured",
    });
  }

  return metadata.authentication as RouteAuthenticationStrategy;
}

export function requireAuthenticatedPrincipal(
  request: AuthenticatedRequest,
  expectedRealm: AuthenticationRealm,
): VerifiedAccessToken {
  if (!request.auth || request.auth.realm !== expectedRealm) {
    throw new AppError({
      code: "authentication_context_missing",
      message: "The authenticated request context is unavailable.",
      statusCode: 500,
      title: "Authentication context missing",
    });
  }

  return request.auth;
}

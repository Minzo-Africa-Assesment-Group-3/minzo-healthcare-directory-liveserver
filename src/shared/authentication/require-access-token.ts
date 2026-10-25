import { AppError } from "../errors/app-error.js";
import type { AccessTokenService, VerifiedAccessToken } from "./access-token.js";

export interface AccessTokenRequest {
  headers: {
    authorization?: string | undefined;
  };
}

function authenticationRequiredError(cause?: unknown): AppError {
  return new AppError({
    cause,
    code: "authentication_required",
    message: "A valid bearer access token is required.",
    statusCode: 401,
    title: "Authentication required"
  });
}

export async function requireAccessToken(
  request: AccessTokenRequest,
  accessToken: AccessTokenService
): Promise<VerifiedAccessToken> {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw authenticationRequiredError();
  }

  const [scheme, token, unexpectedPart] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || unexpectedPart !== undefined) {
    throw authenticationRequiredError();
  }

  try {
    return await accessToken.verify(token);
  } catch (cause) {
    throw authenticationRequiredError(cause);
  }
}

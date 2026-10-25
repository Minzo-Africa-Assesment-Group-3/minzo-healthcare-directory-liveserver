import type { AppRoute } from "@ts-rest/core";
import type { TsRestRequest } from "@ts-rest/express";
import type { NextFunction, Response } from "express";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { AppError } from "../errors/app-error.js";
import type { AccessTokenService } from "./access-token.js";
import { requireAccessToken } from "./require-access-token.js";

export interface AuthenticationMiddlewareDependencies {
  adminAccessToken: AccessTokenService;
  database: DatabaseClient;
  userAccessToken: AccessTokenService;
}

export type AuthenticationMiddleware = <TRoute extends AppRoute>(
  request: TsRestRequest<TRoute>,
  response: Response,
  next: NextFunction
) => void;

export interface AuthenticationMiddlewares {
  admin: AuthenticationMiddleware;
  optionalUser: AuthenticationMiddleware;
  user: AuthenticationMiddleware;
}

function accountUnavailableError(): AppError {
  return new AppError({
    code: "account_unavailable",
    message: "The authenticated account is not available.",
    statusCode: 403,
    title: "Account unavailable"
  });
}

export function createAuthenticationMiddlewares(
  dependencies: AuthenticationMiddlewareDependencies
): AuthenticationMiddlewares {
  const authenticateUser = async <TRoute extends AppRoute>(request: TsRestRequest<TRoute>): Promise<void> => {
    const principal = await requireAccessToken(request, dependencies.userAccessToken);
    const account = await dependencies.database.user.findUnique({
      where: { id: principal.subjectId },
      select: {
        id: true,
        status: true,
        deletedAt: true
      }
    });

    if (!account || account.status !== "ACTIVE" || account.deletedAt) {
      throw accountUnavailableError();
    }

    request.auth = principal;
  };

  const user: AuthenticationMiddleware = (request, _response, next): void => {
    void (async () => {
      await authenticateUser(request);
      next();
    })().catch(next);
  };

  const optionalUser: AuthenticationMiddleware = (request, _response, next): void => {
    if (!request.headers.authorization) {
      next();
      return;
    }

    void authenticateUser(request).then(() => next(), next);
  };

  const admin: AuthenticationMiddleware = (request, _response, next): void => {
    void (async () => {
      const principal = await requireAccessToken(request, dependencies.adminAccessToken);
      const account = await dependencies.database.adminUser.findUnique({
        where: { id: principal.subjectId },
        select: {
          id: true,
          status: true
        }
      });

      if (!account || account.status !== "ACTIVE") {
        throw accountUnavailableError();
      }

      request.auth = principal;
      next();
    })().catch(next);
  };

  return Object.freeze({ admin, optionalUser, user });
}

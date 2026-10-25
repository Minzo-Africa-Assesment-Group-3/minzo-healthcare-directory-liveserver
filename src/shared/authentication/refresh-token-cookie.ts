import type { Request, Response } from "express";

export interface RefreshTokenCookieService {
  clear(response: Response): void;
  read(request: Request): string | undefined;
  set(response: Response, token: string, ttlSeconds: number): void;
}

export function createRefreshTokenCookieService(options: {
  name: string;
  path: string;
  secure: boolean;
}): RefreshTokenCookieService {
  const cookieOptions = {
    httpOnly: true,
    path: options.path,
    sameSite: "lax" as const,
    secure: options.secure
  };

  return Object.freeze({
    clear(response: Response): void {
      response.clearCookie(options.name, cookieOptions);
    },

    read(request: Request): string | undefined {
      const cookies: unknown = request.cookies;

      if (typeof cookies !== "object" || cookies === null || !(options.name in cookies)) {
        return undefined;
      }

      const token = (cookies as Record<string, unknown>)[options.name];
      return typeof token === "string" && token.length > 0 ? token : undefined;
    },

    set(response: Response, token: string, ttlSeconds: number): void {
      response.cookie(options.name, token, {
        ...cookieOptions,
        maxAge: ttlSeconds * 1_000
      });
    }
  });
}

import { createSecretKey, randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

export type AuthenticationRealm = "admin" | "user";

export interface AccessTokenPrincipal {
  subjectId: string;
}

export interface VerifiedAccessToken {
  expiresAt: number;
  issuedAt: number;
  realm: AuthenticationRealm;
  subjectId: string;
  tokenId: string;
}

export interface AccessTokenService {
  create(principal: AccessTokenPrincipal): Promise<string>;
  verify(token: string): Promise<VerifiedAccessToken>;
}

export interface AccessTokenServiceOptions {
  audience: string;
  issuer: string;
  realm: AuthenticationRealm;
  secret: string;
  ttlSeconds: number;
}

function requiredNumber(value: number | undefined, name: string): number {
  if (value === undefined) {
    throw new Error(`Access token is missing the ${name} claim.`);
  }

  return value;
}

function requiredString(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Access token is missing the ${name} claim.`);
  }

  return value;
}

export function createAccessTokenService({
  audience,
  issuer,
  realm,
  secret,
  ttlSeconds
}: AccessTokenServiceOptions): AccessTokenService {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new RangeError("ttlSeconds must be a positive integer.");
  }

  if (!/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error("The access-token secret must be a 64-character hexadecimal value.");
  }

  const signingKey = createSecretKey(Buffer.from(secret, "hex"));

  return Object.freeze({
    async create({ subjectId }: AccessTokenPrincipal): Promise<string> {
      const issuedAt = Math.floor(Date.now() / 1_000);

      return new SignJWT({ realm })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(subjectId)
        .setJti(randomUUID())
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + ttlSeconds)
        .sign(signingKey);
    },

    async verify(token: string): Promise<VerifiedAccessToken> {
      const { payload } = await jwtVerify(token, signingKey, {
        algorithms: ["HS256"],
        audience,
        issuer
      });

      if (payload.realm !== realm) {
        throw new Error("Access token belongs to another authentication realm.");
      }

      return {
        subjectId: requiredString(payload.sub, "sub"),
        tokenId: requiredString(payload.jti, "jti"),
        issuedAt: requiredNumber(payload.iat, "iat"),
        expiresAt: requiredNumber(payload.exp, "exp"),
        realm
      };
    }
  });
}

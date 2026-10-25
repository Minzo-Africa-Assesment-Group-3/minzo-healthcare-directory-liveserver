import { createHash, randomBytes } from "node:crypto";

export interface GeneratedRefreshToken {
  expiresAt: Date;
  token: string;
  tokenHash: string;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateRefreshToken(ttlSeconds: number, now: Date = new Date()): GeneratedRefreshToken {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new RangeError("ttlSeconds must be a positive integer.");
  }

  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1_000)
  };
}

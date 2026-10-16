import {
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";

export interface GeneratedEmailVerificationToken {
  expiresAt: Date;
  id: string;
  token: string;
  tokenHash: string;
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateEmailVerificationToken(
  ttlSeconds: number,
  now: Date = new Date(),
): GeneratedEmailVerificationToken {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new RangeError("ttlSeconds must be a positive integer.");
  }

  const token = randomBytes(32).toString("base64url");

  return {
    id: randomUUID(),
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1_000),
  };
}

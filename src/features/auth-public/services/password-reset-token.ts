import { createHash, randomBytes, randomUUID } from "node:crypto";

export interface GeneratedPasswordResetToken {
  expiresAt: Date;
  id: string;
  token: string;
  tokenHash: string;
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generatePasswordResetToken(
  ttlSeconds: number,
  now: Date = new Date()
): GeneratedPasswordResetToken {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new RangeError("ttlSeconds must be a positive integer.");
  }

  const token = randomBytes(32).toString("base64url");

  return {
    id: randomUUID(),
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1_000)
  };
}

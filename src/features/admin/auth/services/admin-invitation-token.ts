import { createHash, randomBytes, randomUUID } from "node:crypto";

export interface GeneratedAdminInvitationToken {
  expiresAt: Date;
  id: string;
  token: string;
  tokenHash: string;
}

export function hashAdminInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateAdminInvitationToken(
  ttlSeconds: number,
  now: Date = new Date()
): GeneratedAdminInvitationToken {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new RangeError("ttlSeconds must be a positive integer.");
  }

  const token = randomBytes(32).toString("base64url");

  return {
    expiresAt: new Date(now.getTime() + ttlSeconds * 1_000),
    id: randomUUID(),
    token,
    tokenHash: hashAdminInvitationToken(token)
  };
}

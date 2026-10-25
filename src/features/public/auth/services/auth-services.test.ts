import { describe, expect, it } from "vitest";

import {
  createAccessTokenService,
  createLoginOtpService,
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  verifyLoginPassword,
  verifyPassword
} from "../../../../shared/authentication/index.js";
import { generateEmailVerificationToken, hashEmailVerificationToken } from "./email-verification-token.js";

describe("password hasher", () => {
  it("hashes and verifies a password with Argon2id", async () => {
    const password = "correct horse battery staple";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "incorrect password")).resolves.toBe(false);
  }, 15_000);

  it("rejects login without a stored user hash while preserving Argon2 work", async () => {
    await expect(verifyLoginPassword(null, "any supplied password")).resolves.toBe(false);
  });
});

describe("access-token service", () => {
  const options = {
    audience: "minzo-test-client",
    issuer: "minzo-test-api",
    realm: "user" as const,
    secret: "a".repeat(64),
    ttlSeconds: 900
  };

  it("creates and verifies an access token", async () => {
    const service = createAccessTokenService(options);
    const token = await service.create({
      subjectId: "0317cf33-0e56-42d4-963c-9c7088a89d25"
    });
    const verifiedToken = await service.verify(token);

    expect(verifiedToken).toMatchObject({
      subjectId: "0317cf33-0e56-42d4-963c-9c7088a89d25",
      realm: "user"
    });
    expect(verifiedToken.tokenId).toEqual(expect.any(String));
    expect(verifiedToken.expiresAt - verifiedToken.issuedAt).toBe(900);
  });

  it("rejects a token signed with another secret", async () => {
    const issuer = createAccessTokenService(options);
    const verifier = createAccessTokenService({
      ...options,
      secret: "b".repeat(64)
    });
    const token = await issuer.create({ subjectId: "user-id" });

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it("rejects a token issued for another authentication realm", async () => {
    const userTokens = createAccessTokenService(options);
    const adminTokens = createAccessTokenService({
      ...options,
      realm: "admin"
    });
    const token = await userTokens.create({ subjectId: "shared-id" });

    await expect(adminTokens.verify(token)).rejects.toThrow("another authentication realm");
  });
});

describe("refresh-token service", () => {
  it("generates an opaque token, its hash, and its expiry", () => {
    const now = new Date("2026-10-13T00:00:00.000Z");
    const refreshToken = generateRefreshToken(3_600, now);

    expect(refreshToken.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(refreshToken.tokenHash).toBe(hashRefreshToken(refreshToken.token));
    expect(refreshToken.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(refreshToken.expiresAt).toEqual(new Date("2026-10-13T01:00:00.000Z"));
  });

  it("generates a different token every time", () => {
    const first = generateRefreshToken(3_600);
    const second = generateRefreshToken(3_600);

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});

describe("email-verification-token service", () => {
  it("generates a single-use token representation and expiry", () => {
    const now = new Date("2026-10-13T00:00:00.000Z");
    const verificationToken = generateEmailVerificationToken(3_600, now);

    expect(verificationToken.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(verificationToken.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verificationToken.tokenHash).toBe(hashEmailVerificationToken(verificationToken.token));
    expect(verificationToken.expiresAt).toEqual(new Date("2026-10-13T01:00:00.000Z"));
  });
});

describe("login-otp service", () => {
  it("generates and verifies a four-digit challenge-bound OTP", () => {
    const service = createLoginOtpService({
      secret: "c".repeat(64),
      ttlSeconds: 300
    });
    const now = new Date("2026-10-13T00:00:00.000Z");
    const challenge = service.generate(now);

    expect(challenge.otp).toMatch(/^\d{4}$/);
    expect(challenge.otpDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(challenge.expiresAt).toEqual(new Date("2026-10-13T00:05:00.000Z"));
    expect(service.verify(challenge.challengeId, challenge.otp, challenge.otpDigest)).toBe(true);
    expect(
      service.verify(
        challenge.challengeId,
        `${challenge.otp[0] === "0" ? "1" : "0"}${challenge.otp.slice(1)}`,
        challenge.otpDigest
      )
    ).toBe(false);
  });
});

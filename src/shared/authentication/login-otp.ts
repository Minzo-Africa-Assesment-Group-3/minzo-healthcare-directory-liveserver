import {
  createHmac,
  createSecretKey,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

export interface GeneratedLoginOtp {
  challengeId: string;
  expiresAt: Date;
  otp: string;
  otpDigest: string;
}

export interface LoginOtpService {
  generate(now?: Date): GeneratedLoginOtp;
  verify(challengeId: string, otp: string, expectedDigest: string): boolean;
}

export function createLoginOtpService(options: {
  secret: string;
  ttlSeconds: number;
}): LoginOtpService {
  if (!/^[a-fA-F0-9]{64}$/.test(options.secret)) {
    throw new Error(
      "The login OTP secret must be a 64-character hexadecimal value.",
    );
  }

  if (!Number.isInteger(options.ttlSeconds) || options.ttlSeconds < 1) {
    throw new RangeError("ttlSeconds must be a positive integer.");
  }

  const key = createSecretKey(Buffer.from(options.secret, "hex"));

  function digest(challengeId: string, otp: string): Buffer {
    return createHmac("sha256", key)
      .update(`${challengeId}:${otp}`, "utf8")
      .digest();
  }

  return Object.freeze({
    generate(now: Date = new Date()): GeneratedLoginOtp {
      const challengeId = randomUUID();
      const otp = randomInt(0, 10_000).toString().padStart(4, "0");

      return {
        challengeId,
        otp,
        otpDigest: digest(challengeId, otp).toString("hex"),
        expiresAt: new Date(now.getTime() + options.ttlSeconds * 1_000),
      };
    },

    verify(
      challengeId: string,
      otp: string,
      expectedDigest: string,
    ): boolean {
      if (!/^\d{4}$/.test(otp) || !/^[a-fA-F0-9]{64}$/.test(expectedDigest)) {
        return false;
      }

      return timingSafeEqual(
        digest(challengeId, otp),
        Buffer.from(expectedDigest, "hex"),
      );
    },
  });
}

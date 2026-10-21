import type { EmailSender } from "../../../infrastructure/email/index.js";

export interface SendLoginOtpEmailInput {
  challengeId: string;
  displayName: string;
  email: string;
  otp: string;
}

export interface SendVerificationEmailInput {
  displayName: string;
  email: string;
  token: string;
  tokenId: string;
}

export interface AuthEmailService {
  sendLoginOtp(input: SendLoginOtpEmailInput): Promise<void>;
  sendVerificationEmail(input: SendVerificationEmailInput): Promise<void>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character] ?? character;
  });
}

export function createAuthEmailService(
  emailSender: EmailSender,
  frontendUrl: string,
): AuthEmailService {
  return Object.freeze({
    async sendVerificationEmail(
      input: SendVerificationEmailInput,
    ): Promise<void> {
      const verificationUrl = new URL("/register/verify-email", frontendUrl);
      verificationUrl.searchParams.set("token", input.token);

      const safeName = escapeHtml(input.displayName);
      const safeUrl = escapeHtml(verificationUrl.toString());

      await emailSender.send({
        to: input.email,
        subject: "Verify your Minzo Africa email address",
        text: `Hello ${input.displayName}, verify your email address: ${verificationUrl.toString()}`,
        html: `<p>Hello ${safeName},</p><p>Please verify your email address to activate your Minzo Africa account.</p><p><a href="${safeUrl}">Verify email address</a></p>`,
        idempotencyKey: `email-verification/${input.tokenId}`,
      });
    },

    async sendLoginOtp(input: SendLoginOtpEmailInput): Promise<void> {
      const safeName = escapeHtml(input.displayName);
      const safeOtp = escapeHtml(input.otp);

      await emailSender.send({
        to: input.email,
        subject: "Your Minzo Africa login code",
        text: `Hello ${input.displayName}, your login code is ${input.otp}. It expires shortly.`,
        html: `<p>Hello ${safeName},</p><p>Your login code is:</p><p><strong>${safeOtp}</strong></p><p>This code expires shortly. If you did not attempt to sign in, you can ignore this email.</p>`,
        idempotencyKey: `login-otp/${input.challengeId}`,
      });
    },
  });
}

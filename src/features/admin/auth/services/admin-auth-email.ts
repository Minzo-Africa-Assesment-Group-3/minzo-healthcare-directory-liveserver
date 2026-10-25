import type { EmailSender } from "../../../../infrastructure/email/index.js";

export interface AdminAuthEmailService {
  sendInvitation(input: SendAdminInvitationEmailInput): Promise<void>;
  sendLoginOtp(input: SendAdminLoginOtpEmailInput): Promise<void>;
}

export interface SendAdminInvitationEmailInput {
  displayName: string;
  email: string;
  invitationId: string;
  token: string;
}

export interface SendAdminLoginOtpEmailInput {
  challengeId: string;
  displayName: string;
  email: string;
  otp: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character] ?? character;
  });
}

export function createAdminAuthEmailService(emailSender: EmailSender, frontendUrl: string): AdminAuthEmailService {
  return Object.freeze({
    async sendInvitation(input: SendAdminInvitationEmailInput): Promise<void> {
      const invitationUrl = new URL("/admin/accept-invitation", frontendUrl);
      invitationUrl.searchParams.set("token", input.token);

      const safeName = escapeHtml(input.displayName);
      const safeUrl = escapeHtml(invitationUrl.toString());

      await emailSender.send({
        to: input.email,
        subject: "You are invited to Minzo Africa administration",
        text: `Hello ${input.displayName}, accept your Minzo Africa admin invitation: ${invitationUrl.toString()}`,
        html: `<p>Hello ${safeName},</p><p>You have been invited to join Minzo Africa administration.</p><p><a href="${safeUrl}">Accept invitation</a></p><p>If you were not expecting this invitation, you can ignore this email.</p>`,
        idempotencyKey: `admin-invitation/${input.invitationId}`
      });
    },

    async sendLoginOtp(input: SendAdminLoginOtpEmailInput): Promise<void> {
      const safeName = escapeHtml(input.displayName);
      const safeOtp = escapeHtml(input.otp);

      await emailSender.send({
        to: input.email,
        subject: "Your Minzo Africa admin login code",
        text: `Hello ${input.displayName}, your admin login code is ${input.otp}. It expires shortly.`,
        html: `<p>Hello ${safeName},</p><p>Your Minzo Africa admin login code is:</p><p><strong>${safeOtp}</strong></p><p>This code expires shortly. If you did not attempt to sign in, contact Minzo Africa immediately.</p>`,
        idempotencyKey: `admin-login-otp/${input.challengeId}`
      });
    }
  });
}

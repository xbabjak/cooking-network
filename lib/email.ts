import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.EMAIL_FROM ?? "noreply@example.com";

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<void> {
  await resend.emails.send({
    from,
    to,
    subject: "Reset your password",
    html: `<p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  });
}

export async function sendVerificationEmail(
  to: string,
  verifyLink: string
): Promise<void> {
  await resend.emails.send({
    from,
    to,
    subject: "Verify your email",
    html: `<p>Please verify your email by clicking the link below:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>`,
  });
}

"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const emailSchema = z.string().email("Invalid email address.");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters.");

const ONE_HOUR_MS = 60 * 60 * 1000;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function requestPasswordReset(
  email: string
): Promise<{ error?: string } | { success: true }> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid email." };
  }
  const normalizedEmail = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, password: true },
  });

  if (!user || !user.password) {
    return { success: true };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + ONE_HOUR_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expires,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetLink = `${baseUrl}/login/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetLink);
  } catch {
    return { error: "Failed to send email. Try again later." };
  }

  return { success: true };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ error?: string } | { success: true }> {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid password." };
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const resetRow = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expires: true },
  });

  if (!resetRow || resetRow.expires <= now) {
    return { error: "Invalid or expired link. Request a new one." };
  }

  const hashedPassword = await bcrypt.hash(parsed.data, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRow.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.delete({
      where: { tokenHash },
    }),
  ]);

  return { success: true };
}

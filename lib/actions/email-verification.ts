"use server";

import crypto from "crypto";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { authOptions } from "@/lib/auth";

function getEmailVerificationTokenDelegate() {
  const delegate = (prisma as { emailVerificationToken?: { findUnique: unknown; create: unknown; delete: unknown; deleteMany: unknown } }).emailVerificationToken;
  if (!delegate) {
    throw new Error(
      "Prisma client is missing EmailVerificationToken. Run 'npx prisma generate' and restart the dev server."
    );
  }
  return delegate;
}

const tokenSchema = z.string().min(1, "Invalid link.");
const emailSchema = z.string().email("Invalid email address.");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function verifyEmail(
  token: string
): Promise<{ error?: string } | { success: true }> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return { error: "Invalid or missing link." };
  }

  const tokenHash = hashToken(parsed.data);
  const now = new Date();

  const evToken = getEmailVerificationTokenDelegate();
  const row = await evToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expires: true },
  });

  if (!row || row.expires <= now) {
    return { error: "Invalid or expired link. Request a new one." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: now },
    }),
    evToken.delete({
      where: { tokenHash },
    }),
  ]);

  return { success: true };
}

export async function resendVerificationEmail(
  email?: string
): Promise<{ error?: string } | { success: true }> {
  let userId: string;
  let userEmail: string;

  if (email !== undefined && email !== "") {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid email." };
    }
    const user = await prisma.user.findUnique({
      where: { email: parsed.data },
      select: { id: true, email: true, emailVerified: true, password: true },
    });
    if (!user || user.emailVerified !== null || !user.password) {
      return { success: true };
    }
    userId = user.id;
    userEmail = user.email;
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized." };
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user || user.emailVerified !== null) {
      return { success: true };
    }
    userId = user.id;
    userEmail = user.email;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + ONE_DAY_MS);

  const evToken = getEmailVerificationTokenDelegate();
  await evToken.deleteMany({
    where: { userId },
  });
  await evToken.create({
    data: { userId, tokenHash, expires },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyLink = `${baseUrl}/login/verify-email?token=${rawToken}`;

  try {
    await sendVerificationEmail(userEmail, verifyLink);
  } catch {
    return { error: "Failed to send email. Try again later." };
  }

  return { success: true };
}

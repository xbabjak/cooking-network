import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, password, name, username } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: "This username is already taken." },
          { status: 400 }
        );
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name ?? null,
        username: username ?? null,
      },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + ONE_DAY_MS);
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash, expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verifyLink = `${baseUrl}/login/verify-email?token=${rawToken}`;
    let verificationEmailSent = true;
    try {
      await sendVerificationEmail(user.email, verifyLink);
    } catch (e) {
      console.error("Verification email send failed:", e);
      verificationEmailSent = false;
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      verificationEmailSent,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 }
    );
  }
}

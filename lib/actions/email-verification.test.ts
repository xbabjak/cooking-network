import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyEmail, resendVerificationEmail } from "./email-verification";
import * as email from "@/lib/email";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

const userId = "user-1";
const validEmail = "user@example.com";

describe("verifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for empty token", async () => {
    const result = await verifyEmail("");
    expect(result).toEqual({ error: "Invalid or missing link." });
    expect(prisma.emailVerificationToken.findUnique).not.toHaveBeenCalled();
  });

  it("returns error when token not found", async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(null);

    const result = await verifyEmail("some-token");

    expect(result).toEqual({ error: "Invalid or expired link. Request a new one." });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns error when token expired", async () => {
    const past = new Date(Date.now() - 1000);
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
      userId,
      expires: past,
    } as never);

    const result = await verifyEmail("some-token");

    expect(result).toEqual({ error: "Invalid or expired link. Request a new one." });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("updates user and deletes token when valid", async () => {
    const future = new Date(Date.now() + 60000);
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
      userId,
      expires: future,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.emailVerificationToken.delete).mockResolvedValue({} as never);

    const result = await verifyEmail("valid-token");

    expect(result).toEqual({ success: true });
    expect(prisma.$transaction).toHaveBeenCalled();
    const txCalls = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[];
    expect(txCalls).toHaveLength(2);
  });
});

describe("resendVerificationEmail (with email)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(email.sendVerificationEmail).mockResolvedValue(undefined);
  });

  it("returns error for invalid email", async () => {
    const result = await resendVerificationEmail("not-an-email");
    expect(result).toEqual({ error: expect.any(String) });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns success when user not found (no email sent)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const result = await resendVerificationEmail(validEmail);
    expect(result).toEqual({ success: true });
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns success when user already verified (no email sent)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      emailVerified: new Date(),
      password: "hashed",
    } as never);
    const result = await resendVerificationEmail(validEmail);
    expect(result).toEqual({ success: true });
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns success when user has no password - Google-only (no email sent)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      emailVerified: null,
      password: null,
    } as never);
    const result = await resendVerificationEmail(validEmail);
    expect(result).toEqual({ success: true });
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("creates token and sends email when user unverified with password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      emailVerified: null,
      password: "hashed",
    } as never);
    vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({} as never);

    const result = await resendVerificationEmail(validEmail);

    expect(result).toEqual({ success: true });
    expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith({
      data: {
        userId,
        tokenHash: expect.any(String),
        expires: expect.any(Date),
      },
    });
    expect(email.sendVerificationEmail).toHaveBeenCalledWith(
      validEmail,
      expect.stringContaining("/login/verify-email?token=")
    );
  });

  it("returns error when sendVerificationEmail throws", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      emailVerified: null,
      password: "hashed",
    } as never);
    vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({} as never);
    vi.mocked(email.sendVerificationEmail).mockRejectedValue(new Error("Send failed"));

    const result = await resendVerificationEmail(validEmail);

    expect(result).toEqual({ error: "Failed to send email. Try again later." });
  });
});

describe("resendVerificationEmail (authenticated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(email.sendVerificationEmail).mockResolvedValue(undefined);
  });

  it("returns error when not logged in", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await resendVerificationEmail();

    expect(result).toEqual({ error: "Unauthorized." });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns success when user already verified (no email sent)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      emailVerified: new Date(),
    } as never);

    const result = await resendVerificationEmail();

    expect(result).toEqual({ success: true });
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("creates token and sends email when user unverified", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      emailVerified: null,
    } as never);
    vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({} as never);

    const result = await resendVerificationEmail();

    expect(result).toEqual({ success: true });
    expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(email.sendVerificationEmail).toHaveBeenCalledWith(
      validEmail,
      expect.stringContaining("/login/verify-email?token=")
    );
  });
});

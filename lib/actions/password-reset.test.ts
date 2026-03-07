import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requestPasswordReset, resetPassword } from "./password-reset";
import * as email from "@/lib/email";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

const validEmail = "user@example.com";
const userId = "user-1";

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(email.sendPasswordResetEmail).mockResolvedValue(undefined);
  });

  it("returns error for invalid email", async () => {
    const result = await requestPasswordReset("not-an-email");
    expect(result).toEqual({ error: expect.any(String) });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns success when user not found (no email sent)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const result = await requestPasswordReset(validEmail);
    expect(result).toEqual({ success: true });
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns success when user has no password - Google-only (no email sent)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      password: null,
    } as never);
    const result = await requestPasswordReset(validEmail);
    expect(result).toEqual({ success: true });
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates token and sends email when user has password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      password: "hashed",
    } as never);
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);

    const result = await requestPasswordReset(validEmail);

    expect(result).toEqual({ success: true });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId,
        tokenHash: expect.any(String),
        expires: expect.any(Date),
      },
    });
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      validEmail,
      expect.stringContaining("/login/reset-password?token=")
    );
  });

  it("returns error when sendPasswordResetEmail throws", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: validEmail,
      password: "hashed",
    } as never);
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);
    vi.mocked(email.sendPasswordResetEmail).mockRejectedValue(new Error("Send failed"));

    const result = await requestPasswordReset(validEmail);

    expect(result).toEqual({ error: "Failed to send email. Try again later." });
  });
});

describe("resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue("newHashed" as never);
  });

  it("returns error for short password", async () => {
    const result = await resetPassword("any-token", "12345");
    expect(result).toEqual({ error: expect.any(String) });
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it("returns error when token invalid (not found)", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);

    const result = await resetPassword("bad-token", "newpass1");

    expect(result).toEqual({
      error: "Invalid or expired link. Request a new one.",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns error when token expired", async () => {
    const past = new Date(Date.now() - 1000);
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      userId,
      expires: past,
    } as never);

    const result = await resetPassword("some-token", "newpass1");

    expect(result).toEqual({
      error: "Invalid or expired link. Request a new one.",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("updates password and deletes token when valid", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      userId,
      expires: new Date(Date.now() + 60000),
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.passwordResetToken.delete).mockResolvedValue({} as never);

    const result = await resetPassword("valid-token", "newpass1");

    expect(result).toEqual({ success: true });
    expect(bcrypt.hash).toHaveBeenCalledWith("newpass1", 10);
    expect(prisma.$transaction).toHaveBeenCalled();
    const txCalls = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[];
    expect(txCalls).toHaveLength(2);
  });
});

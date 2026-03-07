import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn(),
}));

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
  });

  it("returns 400 for invalid body (missing email)", async () => {
    const res = await POST(jsonRequest({ password: "123456" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 for short password", async () => {
    const res = await POST(jsonRequest({ email: "a@b.com", password: "12345" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(jsonRequest({ email: "not-an-email", password: "123456" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 for invalid username (regex)", async () => {
    const res = await POST(
      jsonRequest({
        email: "a@b.com",
        password: "123456",
        username: "bad user!",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when email already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing",
      email: "a@b.com",
    } as never);
    const res = await POST(jsonRequest({ email: "a@b.com", password: "123456" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("An account with this email already exists.");
  });

  it("returns 400 when username already taken", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing", username: "taken" } as never);
    const res = await POST(
      jsonRequest({
        email: "a@b.com",
        password: "123456",
        username: "taken",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("This username is already taken.");
  });

  it("returns 200 and user shape on success", async () => {
    const { sendVerificationEmail } = await import("@/lib/email");
    vi.mocked(sendVerificationEmail).mockResolvedValue(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-user-id",
      email: "a@b.com",
      name: "Test",
      username: "testuser",
    } as never);
    vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({} as never);
    const res = await POST(
      jsonRequest({
        email: "a@b.com",
        password: "123456",
        name: "Test",
        username: "testuser",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      id: "new-user-id",
      email: "a@b.com",
      name: "Test",
      username: "testuser",
    });
    expect(typeof data.verificationEmailSent).toBe("boolean");
    expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "a@b.com",
        password: "hashed",
        name: "Test",
        username: "testuser",
      },
    });
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith({
      data: {
        userId: "new-user-id",
        tokenHash: expect.any(String),
        expires: expect.any(Date),
      },
    });
  });
});

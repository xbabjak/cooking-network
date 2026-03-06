import { vi } from "vitest";

// Prisma: full mock so lib/prisma is never loaded (avoids DATABASE_URL at import)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    plannerEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    unit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Auth: getServerSession must be set per test
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Next cache: no-op so revalidatePath does not throw
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

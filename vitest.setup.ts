import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

expect.extend(matchers);
afterEach(() => cleanup());

// jsdom does not provide window.matchMedia; Mantine uses it
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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
    passwordResetToken: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    emailVerificationToken: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
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

// next13-progressbar: useRouter returns refresh mock
vi.mock("next13-progressbar", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
  Next13ProgressBar: function Next13ProgressBar() {
    return null;
  },
}));

// next-auth/react: unauthenticated by default; SessionProvider pass-through
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signOut: vi.fn(),
  SessionProvider: function SessionProvider({ children }: { children: unknown }) {
    return children;
  },
}));

// next/navigation: stubs for useRouter, usePathname, useSearchParams
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// @mantine/notifications: no-op so tests do not depend on toast DOM
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
  },
}));

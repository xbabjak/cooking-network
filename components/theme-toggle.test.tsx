import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/components/test-utils";
import { ThemeToggle } from "./theme-toggle";

const setColorScheme = vi.fn();
const useComputedColorScheme = vi.fn();

vi.mock("@mantine/core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@mantine/core")>();
  return {
    ...mod,
    useMantineColorScheme: () => ({ setColorScheme }),
    useComputedColorScheme: () => useComputedColorScheme(),
  };
});

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useComputedColorScheme.mockReturnValue("light");
  });

  it("renders with accessible button", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: /toggle color scheme/i })
    ).toBeInTheDocument();
  });

  it("calls setColorScheme with dark when current scheme is light", async () => {
    useComputedColorScheme.mockReturnValue("light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle color scheme/i });
    await userEvent.click(button);
    expect(setColorScheme).toHaveBeenCalledWith("dark");
  });

  it("calls setColorScheme with light when current scheme is dark", async () => {
    useComputedColorScheme.mockReturnValue("dark");
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle color scheme/i });
    await userEvent.click(button);
    expect(setColorScheme).toHaveBeenCalledWith("light");
  });
});

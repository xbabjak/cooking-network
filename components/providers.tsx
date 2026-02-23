"use client";

import { createTheme, MantineProvider } from "@mantine/core";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

const cookingTheme = createTheme({
  primaryColor: "orange",
  colors: {
    orange: [
      "#fffbeb",
      "#fef3c7",
      "#fde68a",
      "#fcd34d",
      "#fbbf24",
      "#f59e0b",
      "#d97706",
      "#b45309",
      "#92400e",
      "#78350f",
    ],
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={cookingTheme} defaultColorScheme="light">
      <SessionProvider>{children}</SessionProvider>
    </MantineProvider>
  );
}

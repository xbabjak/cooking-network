"use client";

import { MantineProvider } from "@mantine/core";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider defaultColorScheme="light">
      <SessionProvider>{children}</SessionProvider>
    </MantineProvider>
  );
}

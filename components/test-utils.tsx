import React from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";
import { ReactElement } from "react";

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

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <MantineProvider theme={cookingTheme} defaultColorScheme="light">
        {children}
      </MantineProvider>
    ),
    ...options,
  });
}

export * from "@testing-library/react";
export { customRender as render };

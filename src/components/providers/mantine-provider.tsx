"use client";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/notifications/styles.css";
import "@/theme/style.css";
import {
  shadcnTheme,
  shadcnCssVariableResolver,
  localStorageColorSchemeManager,
} from "@/theme";

export function MantineProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider
      theme={shadcnTheme}
      cssVariablesResolver={shadcnCssVariableResolver}
      colorSchemeManager={localStorageColorSchemeManager()}
      defaultColorScheme="auto"
    >
      <Notifications position="top-right" />
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}

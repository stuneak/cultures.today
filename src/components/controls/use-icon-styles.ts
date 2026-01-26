"use client";

import { useMediaQuery } from "@mantine/hooks";

export function useIconStyles() {
  const isMobile = useMediaQuery("(max-width: 600px)");

  const actionIconStyles = {
    variant: "main-page-control" as const,
    size: isMobile ? ("lg" as const) : ("xl" as const),
    radius: "lg" as const,
  };

  const iconStyles = {
    size: isMobile ? 20 : 24,
    stroke: 1.5,
  };
  return { actionIconStyles, iconStyles };
}

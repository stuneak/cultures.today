"use client";

import { Box, Text, Skeleton, Stack } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import type { CultureListItem } from "./AdminPage";

interface CultureListProps {
  cultures: CultureListItem[];
  loading: boolean;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

export function CultureList({
  cultures,
  loading,
  selectedSlug,
  onSelect,
}: CultureListProps) {
  if (loading) {
    return (
      <Stack gap="xs" p="md">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={50} radius="sm" />
        ))}
      </Stack>
    );
  }

  if (cultures.length === 0) {
    return (
      <Box p="md">
        <Text c="dimmed" ta="center">
          No cultures found
        </Text>
      </Box>
    );
  }

  return (
    <Stack gap={0}>
      {cultures.map((culture) => (
        <Box
          key={culture.id}
          onClick={() => onSelect(culture.slug)}
          style={{
            padding: "12px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor:
              selectedSlug === culture.slug
                ? "var(--mantine-color-blue-light)"
                : "transparent",
            borderBottom: "1px solid var(--mantine-color-default-border)",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (selectedSlug !== culture.slug) {
              e.currentTarget.style.backgroundColor =
                "var(--mantine-color-gray-light-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedSlug !== culture.slug) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <Box>
            <Text fw={500} size="sm">
              {culture.name}
            </Text>
            <Text size="xs" c="dimmed">
              {culture.submittedBy?.email || "Anonymous"}
            </Text>
          </Box>
          <IconChevronRight size={16} style={{ opacity: 0.5 }} />
        </Box>
      ))}
    </Stack>
  );
}

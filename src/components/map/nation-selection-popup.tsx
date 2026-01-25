"use client";

import { Paper, Text, UnstyledButton, Group, Stack } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

interface Nation {
  id: string;
  name: string;
  slug: string;
  flagUrl: string | null;
}

interface NationSelectionPopupProps {
  nations: Nation[];
  position: { x: number; y: number };
  onSelect: (slug: string) => void;
  onClose: () => void;
}

export function NationSelectionPopup({
  nations,
  position,
  onSelect,
  onClose,
}: NationSelectionPopupProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popup */}
      <Paper
        shadow="md"
        radius="md"
        className="fixed z-50 min-w-[200px] max-w-[300px]"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -100%)",
          marginTop: -10,
        }}
      >
        <div className="p-2">
          <Text size="xs" c="dimmed" className="px-2 py-1">
            Multiple nations at this location
          </Text>
          <Stack gap={0}>
            {nations.map((nation) => (
              <UnstyledButton
                key={nation.id}
                onClick={() => {
                  onSelect(nation.slug);
                  onClose();
                }}
                className="w-full px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    {nation.name}
                  </Text>
                  <IconChevronRight size={16} className="text-gray-400" />
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </div>
      </Paper>
    </>
  );
}

"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useMapStore } from "@/stores/map-store";

interface AddNationButtonProps {
  onStartDrawing: () => void;
}

export function AddNationButton({ onStartDrawing }: AddNationButtonProps) {
  const { isDrawingMode } = useMapStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
      <Tooltip
        label={isDrawingMode ? "Drawing in progress..." : "Add a new nation"}
        position="top"
      >
        <ActionIcon
          size="xl"
          radius="md"
          variant="main-page-control"
          onClick={onStartDrawing}
          disabled={isDrawingMode}
          aria-label="Add nation"
        >
          <IconPlus size={28} stroke={2} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}

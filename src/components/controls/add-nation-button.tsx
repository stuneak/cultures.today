"use client";

import { ActionIcon, Tooltip, Button } from "@mantine/core";
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
        <Button
          variant="main-page-control"
          size="lg"
          onClick={onStartDrawing}
          radius="xl"
        >
          Paint
        </Button>
      </Tooltip>
    </div>
  );
}

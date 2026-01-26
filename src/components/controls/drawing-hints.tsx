"use client";

import { Paper, Text, ActionIcon, Tooltip } from "@mantine/core";
import { IconHandGrab, IconBrush } from "@tabler/icons-react";

interface DrawingHintsProps {
  showMode: boolean;
  onShowModeChange: (showMode: boolean) => void;
  brushMode: "add" | "erase";
}

export function DrawingHints({ showMode, onShowModeChange, brushMode }: DrawingHintsProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
      {/* Mode Toggle Button */}
      <Tooltip label={showMode ? "Switch to Draw (S)" : "Switch to Pan (S)"} position="bottom">
        <ActionIcon
          variant="filled"
          size="xl"
          radius="xl"
          color={showMode ? "gray" : "blue"}
          onClick={() => onShowModeChange(!showMode)}
        >
          {showMode ? <IconHandGrab size={24} /> : <IconBrush size={24} />}
        </ActionIcon>
      </Tooltip>

      {/* Hints Panel */}
      <Paper shadow="sm" p="xs" withBorder>
        <Text size="sm" ta="center" fw={500}>
          {showMode ? "Panning" : brushMode === "add" ? "Drawing" : "Erasing"}
        </Text>
        <Text size="xs" c="dimmed" ta="center" mt={4}>
          {showMode
            ? "Pan/zoom the map. Press S to draw."
            : brushMode === "add"
              ? "Click and drag to paint. W: erase, S: pan"
              : "Click and drag to erase. W: draw, S: pan"}
        </Text>
      </Paper>
    </div>
  );
}

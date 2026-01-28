"use client";

import { Paper, Text, Button, Tooltip } from "@mantine/core";
import { IconHandGrab, IconBrush, IconEraser } from "@tabler/icons-react";

interface DrawingHintsProps {
  showMode: boolean;
  onShowModeChange: (showMode: boolean) => void;
  brushMode: "add" | "erase";
}

export function DrawingHints({
  showMode,
  onShowModeChange,
  brushMode,
}: DrawingHintsProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-1 flex flex-col items-center gap-2">
      {/* Mode Toggle Button */}
      <Tooltip
        label={showMode ? "Switch to Draw (W)" : "Switch to Pan (W)"}
        position="bottom"
      >
        <Button
          variant="filled"
          size="md"
          radius="xl"
          color={showMode ? "red" : brushMode === "erase" ? "red" : "blue"}
          onClick={() => onShowModeChange(!showMode)}
          aria-label={showMode ? "Switch to draw mode" : "Switch to pan mode"}
          leftSection={
            showMode ? (
              <IconHandGrab size={20} />
            ) : brushMode === "erase" ? (
              <IconEraser size={20} />
            ) : (
              <IconBrush size={20} />
            )
          }
        >
          {showMode ? "Panning" : brushMode === "add" ? "Drawing" : "Erasing"}
        </Button>
      </Tooltip>

      {/* Hints Panel */}
      <Paper shadow="sm" p="xs" withBorder>
        <Text size="xs" ta="center">
          {showMode
            ? "Pan/zoom the map. Press W to draw."
            : brushMode === "add"
              ? "Drag to paint. S: erase, W: pan, Esc: cancel, Enter: create"
              : "Drag to erase. S: draw, W: pan, Esc: cancel, Enter: create"}
        </Text>
      </Paper>
    </div>
  );
}

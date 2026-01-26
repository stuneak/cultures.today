"use client";

import { Paper, Text } from "@mantine/core";

interface DrawingHintsProps {
  showMode: boolean;
}

export function DrawingHints({ showMode }: DrawingHintsProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <Paper shadow="sm" p="xs" withBorder>
        <Text size="xs" c="dimmed" ta="center">
          S: pan/draw • W: add/erase • [ / ]: resize • Ctrl+Z: undo • Enter: finish • Esc: cancel
        </Text>
        <Text size="sm" ta="center" mt={4}>
          {showMode
            ? "Pan/zoom the map. Press S to draw."
            : "Click and drag to paint. Press S to pan."}
        </Text>
      </Paper>
    </div>
  );
}

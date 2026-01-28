"use client";

import { Tooltip, Button, Group, ActionIcon } from "@mantine/core";
import { IconCheck, IconX, IconBrush } from "@tabler/icons-react";
import { useIconStyles } from "./use-icon-styles";
import { useMapStore } from "@/stores/map-store";

interface AddCultureButtonProps {
  onStartDrawing: () => void;
}

interface DrawingBottomBarProps {
  onFinish: () => void;
  onCancel: () => void;
  canFinish: boolean;
}

export function DrawingBottomBar({
  onFinish,
  onCancel,
  canFinish,
}: DrawingBottomBarProps) {
  const { actionIconStyles, iconStyles } = useIconStyles();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-1">
      <Group gap="xs">
        <Tooltip label="Finish drawing (Enter)" position="top">
          <ActionIcon
            {...actionIconStyles}
            onClick={onFinish}
            disabled={!canFinish}
            aria-label="Undo"
          >
            <IconCheck {...iconStyles} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Cancel drawing (Esc)" position="top">
          <ActionIcon
            {...actionIconStyles}
            onClick={onCancel}
            aria-label="Undo"
            color="red"
            variant="filled"
          >
            <IconX {...iconStyles} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}

export function AddCultureButton({ onStartDrawing }: AddCultureButtonProps) {
  const isMapReady = useMapStore((state) => state.isMapReady);
  const isMapIdle = useMapStore((state) => state.isMapIdle);

  const canDraw = isMapReady && isMapIdle;
  const tooltipLabel = !isMapReady
    ? "Map is loading..."
    : !isMapIdle
      ? "Wait for map to finish loading..."
      : "Add culture";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-1">
      <Tooltip label={tooltipLabel} position="top">
        <Button
          variant="filled"
          size="lg"
          onClick={onStartDrawing}
          radius="xl"
          color="blue"
          leftSection={<IconBrush size={20} />}
          disabled={!canDraw}
        >
          Draw
        </Button>
      </Tooltip>
    </div>
  );
}

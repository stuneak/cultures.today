"use client";

import { Tooltip, Button, Group, ActionIcon } from "@mantine/core";
import { IconCheck, IconX, IconBrush } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";

interface AddNationButtonProps {
  onStartDrawing: () => void;
}

interface DrawingBottomBarProps {
  onFinish: () => void;
  onCancel: () => void;
  canFinish: boolean;
}
function useIconStyles() {
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

export function DrawingBottomBar({
  onFinish,
  onCancel,
  canFinish,
}: DrawingBottomBarProps) {
  const { actionIconStyles, iconStyles } = useIconStyles();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
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

export function AddNationButton({ onStartDrawing }: AddNationButtonProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
      <Tooltip label="Add a new nation" position="top">
        <Button
          variant="main-page-control"
          size="lg"
          onClick={onStartDrawing}
          radius="xl"
          leftSection={<IconBrush size={20} />}
        >
          Draw
        </Button>
      </Tooltip>
    </div>
  );
}

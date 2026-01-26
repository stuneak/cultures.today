"use client";

import { Tooltip, Button, Group, ActionIcon } from "@mantine/core";
import { IconCheck, IconX, IconBrush } from "@tabler/icons-react";
import { useIconStyles } from "./use-icon-styles";

interface AddNationButtonProps {
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

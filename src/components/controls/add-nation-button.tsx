"use client";

import { Tooltip, Button, Group } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";

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
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
      <Group gap="md">
        <Tooltip label="Finish drawing (Enter)" position="top">
          <Button
            variant="main-page-control"
            size="lg"
            radius="xl"
            color="green"
            onClick={onFinish}
            disabled={!canFinish}
            leftSection={<IconCheck size={20} />}
          >
            Finish
          </Button>
        </Tooltip>
        <Tooltip label="Cancel drawing (Esc)" position="top">
          <Button
            variant="main-page-control"
            size="lg"
            radius="xl"
            color="red"
            onClick={onCancel}
            leftSection={<IconX size={20} />}
          >
            Cancel
          </Button>
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
        >
          Paint
        </Button>
      </Tooltip>
    </div>
  );
}

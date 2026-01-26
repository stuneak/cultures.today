"use client";

import { ActionIcon, Tooltip, Slider, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconHandGrab,
  IconBrush,
  IconEraser,
  IconMinus,
  IconPlus,
  IconArrowBackUp,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import "./drawing-controls.css";

const toolTipStyles = {
  position: "right" as const,
  openDelay: 500,
};

interface DrawingControlsProps {
  showMode: boolean;
  onShowModeChange: (showMode: boolean) => void;
  brushMode: "add" | "erase";
  onBrushModeChange: (mode: "add" | "erase") => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onFinish: () => void;
  onCancel: () => void;
  canUndo: boolean;
  canFinish: boolean;
  formatBrushSize: (value: number) => string;
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

export function DrawingControls({
  showMode,
  onShowModeChange,
  brushMode,
  onBrushModeChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onFinish,
  onCancel,
  canUndo,
  canFinish,
  formatBrushSize,
}: DrawingControlsProps) {
  const { actionIconStyles, iconStyles } = useIconStyles();

  return (
    <div className="drawing-controls-container ml-2">
      <nav>
        <ActionIcon.Group orientation="vertical">
          {/* Pan/Draw Toggle */}
          <Tooltip {...toolTipStyles} label={showMode ? "Pan mode (S)" : "Draw mode (S)"}>
            <ActionIcon
              {...actionIconStyles}
              onClick={() => onShowModeChange(!showMode)}
              aria-label={showMode ? "Switch to draw" : "Switch to pan"}
              color={showMode ? "gray" : "blue"}
            >
              {showMode ? (
                <IconHandGrab {...iconStyles} />
              ) : (
                <IconBrush {...iconStyles} />
              )}
            </ActionIcon>
          </Tooltip>

          {/* Add/Erase Toggle - only in draw mode */}
          {!showMode && (
            <Tooltip
              {...toolTipStyles}
              label={brushMode === "add" ? "Add mode (W)" : "Erase mode (W)"}
            >
              <ActionIcon
                {...actionIconStyles}
                onClick={() =>
                  onBrushModeChange(brushMode === "add" ? "erase" : "add")
                }
                aria-label={brushMode === "add" ? "Switch to erase" : "Switch to add"}
                color={brushMode === "add" ? "blue" : "red"}
              >
                {brushMode === "add" ? (
                  <IconBrush {...iconStyles} />
                ) : (
                  <IconEraser {...iconStyles} />
                )}
              </ActionIcon>
            </Tooltip>
          )}

          {/* Size decrease - only in draw mode */}
          {!showMode && (
            <Tooltip {...toolTipStyles} label="Decrease size ([)">
              <ActionIcon
                {...actionIconStyles}
                onClick={() => onBrushSizeChange(brushSize - 10)}
                disabled={brushSize <= 0}
                aria-label="Decrease brush size"
              >
                <IconMinus {...iconStyles} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Slider - only in draw mode */}
          {!showMode && (
            <div className="brush-slider-container">
              <div className="brush-slider-vertical">
                <Slider
                  value={brushSize}
                  onChange={onBrushSizeChange}
                  min={0}
                  max={100}
                  step={1}
                  size="lg"
                  label={formatBrushSize}
                  labelAlwaysOn={false}
                  inverted
                />
              </div>
              <Text size="xs" ta="center" c="dimmed" mt={8}>
                {formatBrushSize(brushSize)}
              </Text>
            </div>
          )}

          {/* Size increase - only in draw mode */}
          {!showMode && (
            <Tooltip {...toolTipStyles} label="Increase size (])">
              <ActionIcon
                {...actionIconStyles}
                onClick={() => onBrushSizeChange(brushSize + 10)}
                disabled={brushSize >= 100}
                aria-label="Increase brush size"
              >
                <IconPlus {...iconStyles} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Undo */}
          <Tooltip {...toolTipStyles} label="Undo (Ctrl+Z)">
            <ActionIcon
              {...actionIconStyles}
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <IconArrowBackUp {...iconStyles} />
            </ActionIcon>
          </Tooltip>

          {/* Finish */}
          <Tooltip {...toolTipStyles} label="Finish (Enter)">
            <ActionIcon
              {...actionIconStyles}
              onClick={onFinish}
              disabled={!canFinish}
              aria-label="Finish drawing"
              color="green"
            >
              <IconCheck {...iconStyles} />
            </ActionIcon>
          </Tooltip>

          {/* Cancel */}
          <Tooltip {...toolTipStyles} label="Cancel (Esc)">
            <ActionIcon
              {...actionIconStyles}
              onClick={onCancel}
              aria-label="Cancel drawing"
              color="red"
            >
              <IconX {...iconStyles} />
            </ActionIcon>
          </Tooltip>
        </ActionIcon.Group>
      </nav>
    </div>
  );
}

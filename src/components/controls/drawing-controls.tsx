"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBrush,
  IconEraser,
  IconMinus,
  IconPlus,
  IconArrowBackUp,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useRef, useCallback } from "react";
import "./drawing-controls.css";

const toolTipStyles = {
  position: "right" as const,
  openDelay: 500,
};

interface DrawingControlsProps {
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

interface VerticalSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}

function VerticalSlider({ value, onChange, min, max }: VerticalSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const calculateValue = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = 1 - (clientY - rect.top) / rect.height;
      const clampedPercentage = Math.max(0, Math.min(1, percentage));
      return Math.round(min + clampedPercentage * (max - min));
    },
    [min, max, value],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onChange(calculateValue(e.clientY));
    },
    [calculateValue, onChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      onChange(calculateValue(e.clientY));
    },
    [calculateValue, onChange],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      className="vertical-slider-track"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="vertical-slider-fill"
        style={{ height: `${percentage}%` }}
      />
      <div
        className="vertical-slider-thumb"
        style={{ bottom: `${percentage}%` }}
      />
    </div>
  );
}

export function DrawingControls({
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
          {/* Add/Erase Toggle */}
          <Tooltip
            {...toolTipStyles}
            label={brushMode === "add" ? "Erase mode (W)" : "Draw mode (W)"}
          >
            <ActionIcon
              {...actionIconStyles}
              onClick={() =>
                onBrushModeChange(brushMode === "add" ? "erase" : "add")
              }
              aria-label={
                brushMode === "add" ? "Switch to erase" : "Switch to add"
              }
              color={brushMode === "add" ? "blue" : "red"}
            >
              {brushMode === "add" ? (
                <IconEraser {...iconStyles} />
              ) : (
                <IconBrush {...iconStyles} />
              )}
            </ActionIcon>
          </Tooltip>

          {/* Size increase */}
          <Tooltip {...toolTipStyles} label="Increase size ">
            <ActionIcon
              {...actionIconStyles}
              onClick={() => onBrushSizeChange(brushSize + 10)}
              disabled={brushSize >= 100}
              aria-label="Increase brush size"
            >
              <IconPlus {...iconStyles} />
            </ActionIcon>
          </Tooltip>

          {/* Slider */}
          <div className="brush-slider-vertical">
            <VerticalSlider
              value={brushSize}
              onChange={onBrushSizeChange}
              min={0}
              max={100}
            />
          </div>

          {/* Size decrease */}
          <Tooltip {...toolTipStyles} label="Decrease size">
            <ActionIcon
              {...actionIconStyles}
              onClick={() => onBrushSizeChange(brushSize - 10)}
              disabled={brushSize <= 0}
              aria-label="Decrease brush size"
            >
              <IconMinus {...iconStyles} />
            </ActionIcon>
          </Tooltip>

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

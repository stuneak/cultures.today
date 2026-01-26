"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import {
  Button,
  Paper,
  Text,
  Group,
  Slider,
  SegmentedControl,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconArrowBackUp,
  IconBrush,
  IconEraser,
  IconMinus,
  IconPlus,
  IconHandGrab,
} from "@tabler/icons-react";
import { useMapStore } from "@/stores/map-store";
import type { MapMouseEvent, GeoJSONSource } from "maplibre-gl";
import circle from "@turf/circle";
import union from "@turf/union";
import difference from "@turf/difference";
import { feature, featureCollection } from "@turf/helpers";

interface BrushDrawProps {
  onComplete: (geojson: GeoJSON.Feature<GeoJSON.MultiPolygon>) => void;
  onCancel: () => void;
}

// Convert slider value (0-100) to radius in kilometers
function sliderToRadius(value: number): number {
  // Exponential scale: 0.1km (100m) at 0, ~200km at 100
  const minRadius = 0.1;
  const maxRadius = 200;
  const t = value / 100;
  return minRadius + (maxRadius - minRadius) * (t * t); // Quadratic for finer control at small sizes
}

export function BrushDraw({ onComplete, onCancel }: BrushDrawProps) {
  const {
    mapInstance,
    isDrawingMode,
    setIsDrawingMode,
    currentPolygon,
    setCurrentPolygon,
    pushToHistory,
    undo,
    clearDrawing,
    brushMode,
    setBrushMode,
    brushSize,
    setBrushSize,
    getMultiPolygon,
  } = useMapStore();

  const cursorPosRef = useRef<{ lng: number; lat: number } | null>(null);
  const isMouseDownRef = useRef(false);
  const currentPolygonRef = useRef(currentPolygon);
  const [showMode, setShowMode] = useState(false); // false = draw mode, true = show/pan mode

  // Keep ref in sync with state
  useEffect(() => {
    currentPolygonRef.current = currentPolygon;
  }, [currentPolygon]);

  const sourceId = "brush-polygon";
  const cursorSourceId = "brush-cursor";

  const radiusKm = useMemo(() => sliderToRadius(brushSize), [brushSize]);

  // Cleanup map layers and sources
  const cleanupLayers = useCallback(() => {
    if (!mapInstance) return;

    ["brush-polygon-fill", "brush-polygon-line", "brush-cursor-line"].forEach(
      (layer) => {
        if (mapInstance.getLayer(layer)) mapInstance.removeLayer(layer);
      },
    );

    [sourceId, cursorSourceId].forEach((source) => {
      if (mapInstance.getSource(source)) mapInstance.removeSource(source);
    });
  }, [mapInstance]);

  // Finish drawing
  const finishDrawing = useCallback(() => {
    const multiPolygon = getMultiPolygon();
    if (!multiPolygon) return;

    setIsDrawingMode(false);
    cleanupLayers();
    onComplete(multiPolygon);
  }, [getMultiPolygon, setIsDrawingMode, cleanupLayers, onComplete]);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    setIsDrawingMode(false);
    clearDrawing();
    cleanupLayers();
    onCancel();
  }, [setIsDrawingMode, clearDrawing, cleanupLayers, onCancel]);

  // Handle undo
  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  // Update polygon visualization
  const updatePolygonVisualization = useCallback(() => {
    if (!mapInstance) return;

    const polygonSource = mapInstance.getSource(sourceId) as
      | GeoJSONSource
      | undefined;
    if (polygonSource) {
      if (currentPolygon) {
        polygonSource.setData(currentPolygon);
      } else {
        polygonSource.setData(featureCollection([]));
      }
    }
  }, [mapInstance, currentPolygon]);

  // Update cursor preview
  const updateCursorPreview = useCallback(() => {
    if (!mapInstance) return;

    const cursorSource = mapInstance.getSource(cursorSourceId) as
      | GeoJSONSource
      | undefined;
    if (!cursorSource) return;

    // Hide cursor in show mode
    if (showMode || !cursorPosRef.current) {
      cursorSource.setData(featureCollection([]));
      return;
    }

    const cursorCircle = circle(
      [cursorPosRef.current.lng, cursorPosRef.current.lat],
      radiusKm,
      { units: "kilometers" },
    );
    cursorSource.setData(cursorCircle);
  }, [mapInstance, radiusKm, showMode]);

  // Handle stamp (add or erase)
  const handleStamp = useCallback(
    (lng: number, lat: number) => {
      const stampCircle = circle([lng, lat], radiusKm, { units: "kilometers" });
      const current = currentPolygonRef.current; // Use ref for latest value

      let newPolygon: GeoJSON.Feature<
        GeoJSON.Polygon | GeoJSON.MultiPolygon
      > | null;

      if (brushMode === "add") {
        if (!current) {
          newPolygon = stampCircle as GeoJSON.Feature<GeoJSON.Polygon>;
        } else {
          const merged = union(
            featureCollection([current, stampCircle]),
          );
          newPolygon = merged as GeoJSON.Feature<
            GeoJSON.Polygon | GeoJSON.MultiPolygon
          > | null;
        }
      } else {
        // Erase mode
        if (!current) {
          return; // Nothing to erase
        }
        const subtracted = difference(
          featureCollection([current, stampCircle]),
        );
        newPolygon = subtracted as GeoJSON.Feature<
          GeoJSON.Polygon | GeoJSON.MultiPolygon
        > | null;
      }

      if (newPolygon) {
        currentPolygonRef.current = newPolygon; // Update ref immediately
        pushToHistory(newPolygon);
        setCurrentPolygon(newPolygon);
      } else {
        // Erased everything
        currentPolygonRef.current = null; // Update ref immediately
        pushToHistory(current!);
        setCurrentPolygon(null);
      }
    },
    [brushMode, radiusKm, pushToHistory, setCurrentPolygon],
  );

  // Setup map layers
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const setupLayers = () => {
      // Polygon source and layers
      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: featureCollection([]),
        });
        mapInstance.addLayer({
          id: "brush-polygon-fill",
          type: "fill",
          source: sourceId,
          paint: { "fill-color": "#3b82f6", "fill-opacity": 0.2 },
        });
        mapInstance.addLayer({
          id: "brush-polygon-line",
          type: "line",
          source: sourceId,
          paint: { "line-color": "#3b82f6", "line-width": 3 },
        });
      }

      // Cursor preview source and layer
      if (!mapInstance.getSource(cursorSourceId)) {
        mapInstance.addSource(cursorSourceId, {
          type: "geojson",
          data: featureCollection([]),
        });
        mapInstance.addLayer({
          id: "brush-cursor-line",
          type: "line",
          source: cursorSourceId,
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-dasharray": [3, 3],
          },
        });
      }

      mapInstance.getCanvas().style.cursor = showMode ? "grab" : "crosshair";
    };

    if (mapInstance.isStyleLoaded()) {
      setupLayers();
    } else {
      mapInstance.once("style.load", setupLayers);
    }

    return () => {
      if (mapInstance.getCanvas()) {
        mapInstance.getCanvas().style.cursor = "";
      }
    };
  }, [mapInstance, isDrawingMode, showMode]);

  // Update cursor color based on brush mode
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const layer = mapInstance.getLayer("brush-cursor-line");
    if (layer) {
      mapInstance.setPaintProperty(
        "brush-cursor-line",
        "line-color",
        brushMode === "add" ? "#3b82f6" : "#ef4444",
      );
    }
  }, [mapInstance, isDrawingMode, brushMode]);

  // Update visualization when polygon changes
  useEffect(() => {
    updatePolygonVisualization();
  }, [currentPolygon, updatePolygonVisualization]);

  // Update cursor when brush size or show mode changes
  useEffect(() => {
    updateCursorPreview();
  }, [radiusKm, showMode, updateCursorPreview]);

  // Map event handlers
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const onMouseDown = (e: MapMouseEvent) => {
      if (showMode) {
        // In show mode, allow panning (don't interfere)
        return;
      }
      isMouseDownRef.current = true;
      handleStamp(e.lngLat.lng, e.lngLat.lat);
      mapInstance.dragPan.disable();
    };

    const onMouseUp = () => {
      if (showMode) return;
      isMouseDownRef.current = false;
      mapInstance.dragPan.enable();
    };

    const onMouseMove = (e: MapMouseEvent) => {
      cursorPosRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };

      if (!showMode) {
        updateCursorPreview();
        // Continuous drawing while mouse is held down
        if (isMouseDownRef.current) {
          handleStamp(e.lngLat.lng, e.lngLat.lat);
        }
      }
    };

    // Handle mouse up outside the map
    const onDocumentMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        mapInstance.dragPan.enable();
      }
    };

    mapInstance.on("mousedown", onMouseDown);
    mapInstance.on("mouseup", onMouseUp);
    mapInstance.on("mousemove", onMouseMove);
    document.addEventListener("mouseup", onDocumentMouseUp);

    return () => {
      mapInstance.off("mousedown", onMouseDown);
      mapInstance.off("mouseup", onMouseUp);
      mapInstance.off("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onDocumentMouseUp);
    };
  }, [mapInstance, isDrawingMode, handleStamp, updateCursorPreview, showMode]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isDrawingMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelDrawing();
      } else if (e.key === "Enter") {
        if (currentPolygon) {
          finishDrawing();
        }
      } else if (
        (e.key === "z" && (e.ctrlKey || e.metaKey)) ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "w" || e.key === "W") {
        setBrushMode(brushMode === "add" ? "erase" : "add");
      } else if (e.key === "s" || e.key === "S") {
        setShowMode((prev) => !prev);
      } else if (e.key === "[") {
        setBrushSize(brushSize - 10);
      } else if (e.key === "]") {
        setBrushSize(brushSize + 10);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isDrawingMode,
    cancelDrawing,
    finishDrawing,
    handleUndo,
    setBrushMode,
    setBrushSize,
    brushSize,
    brushMode,
    currentPolygon,
  ]);

  if (!isDrawingMode) return null;

  return (
    <Paper
      className="fixed top-4 left-1/2 -translate-x-1/2 z-20"
      shadow="md"
      p="md"
      withBorder
    >
      <Text size="sm" mb="xs">
        {showMode
          ? "Pan/zoom the map. Press S to draw."
          : "Click and drag to paint. Press S to pan."}
      </Text>

      {/* Show Mode Toggle */}
      <Group mb="sm">
        <Button
          size="xs"
          variant={showMode ? "filled" : "light"}
          leftSection={<IconHandGrab size={16} />}
          onClick={() => setShowMode(true)}
        >
          Pan
        </Button>
        <Button
          size="xs"
          variant={!showMode ? "filled" : "light"}
          leftSection={<IconBrush size={16} />}
          onClick={() => setShowMode(false)}
        >
          Draw
        </Button>
        <Text size="xs" c="dimmed">(S)</Text>
      </Group>

      {/* Brush Mode Toggle - only visible in draw mode */}
      {!showMode && (
        <Group mb="sm">
          <SegmentedControl
            value={brushMode}
            onChange={(value) => setBrushMode(value as "add" | "erase")}
            data={[
              {
                value: "add",
                label: (
                  <Group gap={4}>
                    <IconBrush size={16} />
                    <span>Add</span>
                  </Group>
                ),
              },
              {
                value: "erase",
                label: (
                  <Group gap={4}>
                    <IconEraser size={16} />
                    <span>Erase</span>
                  </Group>
                ),
              },
            ]}
          />
          <Text size="xs" c="dimmed">(W)</Text>
        </Group>
      )}

      {/* Size Controls - only visible in draw mode */}
      {!showMode && (
        <Group mb="sm" gap="xs">
          <Button
            size="xs"
            variant="default"
            onClick={() => setBrushSize(brushSize - 10)}
            disabled={brushSize <= 0}
          >
            <IconMinus size={14} />
          </Button>
          <Slider
            value={brushSize}
            onChange={setBrushSize}
            min={0}
            max={100}
            step={1}
            style={{ flex: 1, minWidth: 150 }}
            label={(v) => {
              const km = sliderToRadius(v);
              return km < 1 ? `${Math.round(km * 1000)}m` : `${Math.round(km)}km`;
            }}
          />
          <Button
            size="xs"
            variant="default"
            onClick={() => setBrushSize(brushSize + 10)}
            disabled={brushSize >= 100}
          >
            <IconPlus size={14} />
          </Button>
        </Group>
      )}

      <Text size="xs" c="dimmed" mb="sm">
        S: pan/draw • W: add/erase • [ / ]: resize • Ctrl+Z: undo • Enter: finish • Esc: cancel
      </Text>

      {/* Action Buttons */}
      <Group justify="center">
        <Button
          size="sm"
          variant="filled"
          radius="md"
          leftSection={<IconArrowBackUp size={16} />}
          onClick={handleUndo}
          disabled={!currentPolygon}
        >
          Undo
        </Button>
        <Button
          variant="filled"
          size="sm"
          radius="md"
          leftSection={<IconCheck size={16} />}
          onClick={finishDrawing}
          disabled={!currentPolygon}
        >
          Finish
        </Button>
        <Button
          size="sm"
          variant="light"
          radius="md"
          color="red"
          leftSection={<IconX size={16} />}
          onClick={cancelDrawing}
        >
          Cancel
        </Button>
      </Group>
    </Paper>
  );
}

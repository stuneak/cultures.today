"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { Button, Paper, Text, Group, Slider, SegmentedControl } from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconArrowBackUp,
  IconBrush,
  IconEraser,
  IconMinus,
  IconPlus,
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
  // Exponential scale: 5km at 0, ~200km at 100
  const minRadius = 5;
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

  const sourceId = "brush-polygon";
  const cursorSourceId = "brush-cursor";

  const radiusKm = useMemo(() => sliderToRadius(brushSize), [brushSize]);

  // Cleanup map layers and sources
  const cleanupLayers = useCallback(() => {
    if (!mapInstance) return;

    ["brush-polygon-fill", "brush-polygon-line", "brush-cursor-line"].forEach((layer) => {
      if (mapInstance.getLayer(layer)) mapInstance.removeLayer(layer);
    });

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

    const polygonSource = mapInstance.getSource(sourceId) as GeoJSONSource | undefined;
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
    if (!mapInstance || !cursorPosRef.current) return;

    const cursorSource = mapInstance.getSource(cursorSourceId) as GeoJSONSource | undefined;
    if (cursorSource) {
      const cursorCircle = circle(
        [cursorPosRef.current.lng, cursorPosRef.current.lat],
        radiusKm,
        { units: "kilometers" }
      );
      cursorSource.setData(cursorCircle);
    }
  }, [mapInstance, radiusKm]);

  // Handle stamp (add or erase)
  const handleStamp = useCallback(
    (lng: number, lat: number) => {
      const stampCircle = circle([lng, lat], radiusKm, { units: "kilometers" });

      let newPolygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;

      if (brushMode === "add") {
        if (!currentPolygon) {
          newPolygon = stampCircle as GeoJSON.Feature<GeoJSON.Polygon>;
        } else {
          const merged = union(featureCollection([currentPolygon, stampCircle]));
          newPolygon = merged as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
        }
      } else {
        // Erase mode
        if (!currentPolygon) {
          return; // Nothing to erase
        }
        const subtracted = difference(featureCollection([currentPolygon, stampCircle]));
        newPolygon = subtracted as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
      }

      if (newPolygon) {
        pushToHistory(newPolygon);
        setCurrentPolygon(newPolygon);
      } else {
        // Erased everything
        pushToHistory(currentPolygon!);
        setCurrentPolygon(null);
      }
    },
    [brushMode, currentPolygon, radiusKm, pushToHistory, setCurrentPolygon]
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

      mapInstance.getCanvas().style.cursor = "crosshair";
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
  }, [mapInstance, isDrawingMode]);

  // Update cursor color based on brush mode
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const layer = mapInstance.getLayer("brush-cursor-line");
    if (layer) {
      mapInstance.setPaintProperty(
        "brush-cursor-line",
        "line-color",
        brushMode === "add" ? "#3b82f6" : "#ef4444"
      );
    }
  }, [mapInstance, isDrawingMode, brushMode]);

  // Update visualization when polygon changes
  useEffect(() => {
    updatePolygonVisualization();
  }, [currentPolygon, updatePolygonVisualization]);

  // Update cursor when brush size changes
  useEffect(() => {
    updateCursorPreview();
  }, [radiusKm, updateCursorPreview]);

  // Map event handlers
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const onClick = (e: MapMouseEvent) => {
      handleStamp(e.lngLat.lng, e.lngLat.lat);
    };

    const onMouseMove = (e: MapMouseEvent) => {
      cursorPosRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      updateCursorPreview();
    };

    mapInstance.on("click", onClick);
    mapInstance.on("mousemove", onMouseMove);

    return () => {
      mapInstance.off("click", onClick);
      mapInstance.off("mousemove", onMouseMove);
    };
  }, [mapInstance, isDrawingMode, handleStamp, updateCursorPreview]);

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
      } else if ((e.key === "z" && (e.ctrlKey || e.metaKey)) || e.key === "Backspace") {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "b" || e.key === "B") {
        setBrushMode("add");
      } else if (e.key === "e" || e.key === "E") {
        setBrushMode("erase");
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
        Click to stamp. Use brush to add, eraser to subtract.
      </Text>

      {/* Mode Toggle */}
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
                  <span>Add (B)</span>
                </Group>
              ),
            },
            {
              value: "erase",
              label: (
                <Group gap={4}>
                  <IconEraser size={16} />
                  <span>Erase (E)</span>
                </Group>
              ),
            },
          ]}
        />
      </Group>

      {/* Size Controls */}
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
          label={(v) => `${Math.round(sliderToRadius(v))} km`}
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

      <Text size="xs" c="dimmed" mb="sm">
        Esc: cancel • Enter: finish • Ctrl+Z: undo • [ / ]: resize
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

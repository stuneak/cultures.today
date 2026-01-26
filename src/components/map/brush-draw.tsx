"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useMapStore } from "@/stores/map-store";
import { DrawingControls } from "@/components/controls/drawing-controls";
import { DrawingHints } from "@/components/controls/drawing-hints";
import { DrawingBottomBar } from "@/components/controls/add-nation-button";
import type { MapMouseEvent, GeoJSONSource } from "maplibre-gl";
import circle from "@turf/circle";
import union from "@turf/union";
import difference from "@turf/difference";
import buffer from "@turf/buffer";
import { featureCollection, lineString } from "@turf/helpers";

interface BrushDrawProps {
  onComplete: (geojson: GeoJSON.Feature<GeoJSON.MultiPolygon>) => void;
  onCancel: () => void;
}

// Convert slider value (0-100) to radius in kilometers
function sliderToRadius(value: number): number {
  // Exponential scale: 1km at 0, ~200km at 100
  const minRadius = 1;  // 1 kilometer minimum
  const maxRadius = 200;
  const t = value / 100;
  return minRadius + (maxRadius - minRadius) * (t * t); // Quadratic for finer control at small sizes
}

function formatBrushSize(value: number): string {
  const km = sliderToRadius(value);
  return km < 1 ? `${Math.round(km * 1000)}m` : `${Math.round(km)}km`;
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
    showMode,
    setShowMode,
  } = useMapStore();

  const cursorPosRef = useRef<{ lng: number; lat: number } | null>(null);
  const isMouseDownRef = useRef(false);
  const strokePointsRef = useRef<[number, number][]>([]);
  const currentPolygonRef = useRef(currentPolygon);

  // Keep ref in sync with state
  useEffect(() => {
    currentPolygonRef.current = currentPolygon;
  }, [currentPolygon]);

  const sourceId = "brush-polygon";
  const cursorSourceId = "brush-cursor";
  const strokeSourceId = "brush-stroke";

  const radiusKm = useMemo(() => sliderToRadius(brushSize), [brushSize]);

  // Cleanup map layers and sources
  const cleanupLayers = useCallback(() => {
    if (!mapInstance) return;

    ["brush-polygon-fill", "brush-polygon-line", "brush-cursor-line", "brush-stroke-fill", "brush-stroke-line"].forEach(
      (layer) => {
        if (mapInstance.getLayer(layer)) mapInstance.removeLayer(layer);
      },
    );

    [sourceId, cursorSourceId, strokeSourceId].forEach((source) => {
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

  // Update live stroke preview while drawing
  const updateStrokePreview = useCallback(() => {
    if (!mapInstance) return;

    const strokeSource = mapInstance.getSource(strokeSourceId) as
      | GeoJSONSource
      | undefined;
    if (!strokeSource) return;

    const points = strokePointsRef.current;
    if (points.length < 2) {
      // Single point - show a circle
      if (points.length === 1) {
        const singleCircle = circle(points[0], radiusKm, { units: "kilometers" });
        strokeSource.setData(singleCircle);
      } else {
        strokeSource.setData(featureCollection([]));
      }
      return;
    }

    // Create a buffered line from all points
    const line = lineString(points);
    const bufferedLine = buffer(line, radiusKm, { units: "kilometers" });
    if (bufferedLine) {
      strokeSource.setData(bufferedLine);
    }
  }, [mapInstance, radiusKm]);

  // Clear the stroke preview
  const clearStrokePreview = useCallback(() => {
    strokePointsRef.current = [];
    if (mapInstance) {
      const strokeSource = mapInstance.getSource(strokeSourceId) as GeoJSONSource | undefined;
      if (strokeSource) {
        strokeSource.setData(featureCollection([]));
      }
    }
  }, [mapInstance]);

  // Commit the stroke when mouse is released
  const commitStroke = useCallback(() => {
    const points = strokePointsRef.current;
    if (points.length === 0) {
      clearStrokePreview();
      return;
    }

    // Create the stroke shape
    let strokeShape: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;

    if (points.length === 1) {
      // Single click - create a circle
      strokeShape = circle(points[0], radiusKm, { units: "kilometers" }) as GeoJSON.Feature<GeoJSON.Polygon>;
    } else {
      // Multiple points - create a buffered line
      const line = lineString(points);
      strokeShape = buffer(line, radiusKm, { units: "kilometers" }) as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
    }

    if (!strokeShape) {
      clearStrokePreview();
      return;
    }

    const current = currentPolygonRef.current;
    let newPolygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;

    if (brushMode === "add") {
      if (!current) {
        newPolygon = strokeShape;
      } else {
        const merged = union(featureCollection([current, strokeShape]));
        newPolygon = merged as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
      }
    } else {
      // Erase mode
      if (!current) {
        clearStrokePreview();
        return; // Nothing to erase
      }
      const subtracted = difference(featureCollection([current, strokeShape]));
      newPolygon = subtracted as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
    }

    // Clear stroke preview
    clearStrokePreview();

    if (newPolygon) {
      currentPolygonRef.current = newPolygon;
      pushToHistory(newPolygon);
      setCurrentPolygon(newPolygon);
    } else {
      // Erased everything
      currentPolygonRef.current = null;
      pushToHistory(current!);
      setCurrentPolygon(null);
    }
  }, [brushMode, radiusKm, pushToHistory, setCurrentPolygon, clearStrokePreview]);

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

      // Live stroke preview source and layers
      if (!mapInstance.getSource(strokeSourceId)) {
        mapInstance.addSource(strokeSourceId, {
          type: "geojson",
          data: featureCollection([]),
        });
        mapInstance.addLayer({
          id: "brush-stroke-fill",
          type: "fill",
          source: strokeSourceId,
          paint: { "fill-color": "#3b82f6", "fill-opacity": 0.4 },
        });
        mapInstance.addLayer({
          id: "brush-stroke-line",
          type: "line",
          source: strokeSourceId,
          paint: { "line-color": "#3b82f6", "line-width": 2 },
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

  // Update cursor and stroke color based on brush mode
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const color = brushMode === "add" ? "#3b82f6" : "#ef4444";

    if (mapInstance.getLayer("brush-cursor-line")) {
      mapInstance.setPaintProperty("brush-cursor-line", "line-color", color);
    }
    if (mapInstance.getLayer("brush-stroke-fill")) {
      mapInstance.setPaintProperty("brush-stroke-fill", "fill-color", color);
    }
    if (mapInstance.getLayer("brush-stroke-line")) {
      mapInstance.setPaintProperty("brush-stroke-line", "line-color", color);
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
      strokePointsRef.current = [[e.lngLat.lng, e.lngLat.lat]];
      updateStrokePreview();
      mapInstance.dragPan.disable();
    };

    const onMouseUp = () => {
      if (showMode) return;
      if (isMouseDownRef.current) {
        commitStroke();
      }
      isMouseDownRef.current = false;
      mapInstance.dragPan.enable();
    };

    const onMouseMove = (e: MapMouseEvent) => {
      cursorPosRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };

      if (!showMode) {
        updateCursorPreview();
        // Collect points while drawing
        if (isMouseDownRef.current) {
          const points = strokePointsRef.current;
          const lastPoint = points[points.length - 1];
          if (lastPoint) {
            const dx = e.lngLat.lng - lastPoint[0];
            const dy = e.lngLat.lat - lastPoint[1];
            const minDistance = radiusKm * 0.002; // Minimum distance between points
            if (Math.sqrt(dx * dx + dy * dy) > minDistance) {
              strokePointsRef.current.push([e.lngLat.lng, e.lngLat.lat]);
              updateStrokePreview();
            }
          }
        }
      }
    };

    // Handle mouse up outside the map
    const onDocumentMouseUp = () => {
      if (isMouseDownRef.current) {
        commitStroke();
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
  }, [mapInstance, isDrawingMode, commitStroke, updateCursorPreview, updateStrokePreview, showMode, radiusKm]);

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
      } else if (e.code === "KeyW") {
        setBrushMode(brushMode === "add" ? "erase" : "add");
      } else if (e.code === "KeyS") {
        setShowMode(!showMode);
      } else if (e.code === "KeyA") {
        setBrushSize(brushSize - 10);
      } else if (e.code === "KeyD") {
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
    showMode,
    setShowMode,
  ]);

  if (!isDrawingMode) return null;

  return (
    <>
      <DrawingHints
        showMode={showMode}
        onShowModeChange={setShowMode}
        brushMode={brushMode}
      />
      <DrawingControls
        brushMode={brushMode}
        onBrushModeChange={setBrushMode}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onUndo={handleUndo}
        canUndo={!!currentPolygon}
        formatBrushSize={formatBrushSize}
      />
      <DrawingBottomBar
        onFinish={finishDrawing}
        onCancel={cancelDrawing}
        canFinish={!!currentPolygon}
      />
    </>
  );
}

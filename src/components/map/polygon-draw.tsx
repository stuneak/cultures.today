"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Button, Paper, Text, Group } from "@mantine/core";
import { IconCheck, IconX, IconArrowBackUp } from "@tabler/icons-react";
import { useMapStore } from "@/stores/map-store";
import type { LngLat, MapMouseEvent, GeoJSONSource } from "maplibre-gl";

interface PolygonDrawProps {
  onComplete: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => void;
  onCancel: () => void;
}

export function PolygonDraw({ onComplete, onCancel }: PolygonDrawProps) {
  const { mapInstance, isDrawingMode, setIsDrawingMode, setDrawnPolygon } =
    useMapStore();
  const pointsRef = useRef<LngLat[]>([]);
  const [pointsCount, setPointsCount] = useState(0);
  const cursorPosRef = useRef<LngLat | null>(null);
  const draggingIndexRef = useRef<number | null>(null);

  const sourceId = "drawing-polygon";
  const previewSourceId = "drawing-preview";
  const verticesSourceId = "drawing-vertices";

  // Cleanup map layers and sources
  const cleanupLayers = useCallback(() => {
    if (!mapInstance) return;

    [
      "drawing-polygon-fill",
      "drawing-polygon-line",
      "drawing-preview-line",
      "drawing-vertices-circle",
      "drawing-vertices-first",
    ].forEach((layer) => {
      if (mapInstance.getLayer(layer)) mapInstance.removeLayer(layer);
    });

    [sourceId, previewSourceId, verticesSourceId].forEach((source) => {
      if (mapInstance.getSource(source)) mapInstance.removeSource(source);
    });
  }, [mapInstance]);

  // Complete the polygon
  const completePolygon = useCallback(() => {
    if (pointsRef.current.length < 3) return;

    const coordinates = pointsRef.current.map((p) => [p.lng, p.lat]);
    coordinates.push(coordinates[0]);

    const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [coordinates] },
    };

    pointsRef.current = [];
    setPointsCount(0);
    cursorPosRef.current = null;
    draggingIndexRef.current = null;
    setDrawnPolygon(polygon);
    setIsDrawingMode(false);
    cleanupLayers();
    onComplete(polygon);
  }, [cleanupLayers, onComplete, setDrawnPolygon, setIsDrawingMode]);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    pointsRef.current = [];
    setPointsCount(0);
    cursorPosRef.current = null;
    draggingIndexRef.current = null;
    setIsDrawingMode(false);
    setDrawnPolygon(null);
    cleanupLayers();
    onCancel();
  }, [cleanupLayers, onCancel, setIsDrawingMode, setDrawnPolygon]);

  // Undo last point
  const undoPoint = useCallback(() => {
    if (pointsRef.current.length > 0 && mapInstance) {
      pointsRef.current.pop();
      setPointsCount(pointsRef.current.length);

      const polygonSource = mapInstance.getSource(sourceId) as
        | GeoJSONSource
        | undefined;
      const previewSource = mapInstance.getSource(previewSourceId) as
        | GeoJSONSource
        | undefined;
      const verticesSource = mapInstance.getSource(verticesSourceId) as
        | GeoJSONSource
        | undefined;

      // Clear polygon/line if less than 2 points
      if (pointsRef.current.length < 2 && polygonSource) {
        polygonSource.setData({ type: "FeatureCollection", features: [] });
      }

      // Clear preview line if no points
      if (pointsRef.current.length === 0 && previewSource) {
        previewSource.setData({ type: "FeatureCollection", features: [] });
      }

      // Update vertices
      if (verticesSource) {
        verticesSource.setData({
          type: "FeatureCollection",
          features: pointsRef.current.map((p, i) => ({
            type: "Feature" as const,
            properties: { index: i, isFirst: i === 0 },
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
          })),
        });
      }
    }
  }, [mapInstance]);

  // Update polygon visualization on map
  const updateMapVisualization = useCallback(() => {
    if (!mapInstance) return;

    const points = pointsRef.current;
    const cursor = cursorPosRef.current;

    // Update main polygon
    const polygonSource = mapInstance.getSource(sourceId) as
      | GeoJSONSource
      | undefined;
    if (polygonSource) {
      if (points.length >= 2) {
        const coords = points.map((p) => [p.lng, p.lat]);
        if (points.length >= 3) coords.push(coords[0]);

        polygonSource.setData({
          type: "Feature",
          properties: {},
          geometry:
            points.length >= 3
              ? { type: "Polygon", coordinates: [coords] }
              : { type: "LineString", coordinates: coords },
        });
      } else {
        polygonSource.setData({ type: "FeatureCollection", features: [] });
      }
    }

    // Update preview line (only when not dragging)
    const previewSource = mapInstance.getSource(previewSourceId) as
      | GeoJSONSource
      | undefined;
    if (previewSource) {
      if (points.length >= 1 && cursor && draggingIndexRef.current === null) {
        const lastPoint = points[points.length - 1];
        const previewCoords: number[][] = [
          [lastPoint.lng, lastPoint.lat],
          [cursor.lng, cursor.lat],
        ];
        if (points.length >= 2) {
          previewCoords.push([points[0].lng, points[0].lat]);
        }

        previewSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: previewCoords },
        });
      } else if (draggingIndexRef.current !== null) {
        // Hide preview while dragging
        previewSource.setData({ type: "FeatureCollection", features: [] });
      }
    }

    // Update vertices
    const verticesSource = mapInstance.getSource(verticesSourceId) as
      | GeoJSONSource
      | undefined;
    if (verticesSource) {
      verticesSource.setData({
        type: "FeatureCollection",
        features: points.map((p, i) => ({
          type: "Feature" as const,
          properties: { index: i, isFirst: i === 0 },
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        })),
      });
    }
  }, [mapInstance]);

  // Find vertex index at given coordinates
  const findVertexAt = useCallback(
    (lngLat: LngLat): number | null => {
      if (!mapInstance) return null;

      const zoom = mapInstance.getZoom();
      const threshold = 8 / Math.pow(2, zoom); // Slightly larger than close threshold

      for (let i = 0; i < pointsRef.current.length; i++) {
        const point = pointsRef.current[i];
        const distance = Math.sqrt(
          Math.pow(lngLat.lng - point.lng, 2) +
            Math.pow(lngLat.lat - point.lat, 2),
        );
        if (distance < threshold) {
          return i;
        }
      }
      return null;
    },
    [mapInstance],
  );

  // Setup and teardown drawing mode
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const setupDrawing = () => {
      // Add sources and layers
      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: "drawing-polygon-fill",
          type: "fill",
          source: sourceId,
          paint: { "fill-color": "#3b82f6", "fill-opacity": 0.2 },
        });
        mapInstance.addLayer({
          id: "drawing-polygon-line",
          type: "line",
          source: sourceId,
          paint: { "line-color": "#3b82f6", "line-width": 3 },
        });
      }

      if (!mapInstance.getSource(previewSourceId)) {
        mapInstance.addSource(previewSourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: "drawing-preview-line",
          type: "line",
          source: previewSourceId,
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-dasharray": [3, 3],
          },
        });
      }

      if (!mapInstance.getSource(verticesSourceId)) {
        mapInstance.addSource(verticesSourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: "drawing-vertices-circle",
          type: "circle",
          source: verticesSourceId,
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#3b82f6",
            "circle-stroke-width": 2,
          },
        });
        mapInstance.addLayer({
          id: "drawing-vertices-first",
          type: "circle",
          source: verticesSourceId,
          filter: ["==", ["get", "isFirst"], true],
          paint: {
            "circle-radius": 8,
            "circle-color": "#22c55e",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
      }

      mapInstance.getCanvas().style.cursor = "crosshair";
    };

    if (mapInstance.isStyleLoaded()) {
      setupDrawing();
    } else {
      mapInstance.once("style.load", setupDrawing);
    }

    return () => {
      if (mapInstance.getCanvas()) {
        mapInstance.getCanvas().style.cursor = "";
      }
    };
  }, [mapInstance, isDrawingMode]);

  // Handle map events for drawing and dragging
  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const onMouseDown = (e: MapMouseEvent) => {
      const vertexIndex = findVertexAt(e.lngLat);
      if (vertexIndex !== null) {
        // Start dragging this vertex
        draggingIndexRef.current = vertexIndex;
        mapInstance.dragPan.disable();
        mapInstance.getCanvas().style.cursor = "grabbing";
        e.preventDefault();
      }
    };

    const onMouseUp = () => {
      if (draggingIndexRef.current !== null) {
        draggingIndexRef.current = null;
        mapInstance.dragPan.enable();
        mapInstance.getCanvas().style.cursor = "crosshair";
      }
    };

    const onClick = (e: MapMouseEvent) => {
      // Ignore clicks if we just finished dragging
      if (draggingIndexRef.current !== null) return;

      const newPoint = e.lngLat;
      const points = pointsRef.current;

      // Check if clicking on existing vertex (don't add new point)
      const clickedVertex = findVertexAt(newPoint);
      if (clickedVertex !== null) {
        // If clicking first point with 3+ points, close polygon
        if (clickedVertex === 0 && points.length >= 3) {
          completePolygon();
        }
        return;
      }

      // Check if clicking near first point to close polygon
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = Math.sqrt(
          Math.pow(newPoint.lng - firstPoint.lng, 2) +
            Math.pow(newPoint.lat - firstPoint.lat, 2),
        );
        const zoom = mapInstance.getZoom();
        const threshold = 5 / Math.pow(2, zoom);

        if (distance < threshold) {
          completePolygon();
          return;
        }
      }

      pointsRef.current.push(newPoint);
      setPointsCount(pointsRef.current.length);
      updateMapVisualization();
    };

    const onMouseMove = (e: MapMouseEvent) => {
      cursorPosRef.current = e.lngLat;

      // If dragging a vertex, update its position
      if (draggingIndexRef.current !== null) {
        pointsRef.current[draggingIndexRef.current] = e.lngLat;
        updateMapVisualization();
        return;
      }

      // Update cursor based on whether hovering over a vertex
      const hoveredVertex = findVertexAt(e.lngLat);
      if (hoveredVertex !== null) {
        mapInstance.getCanvas().style.cursor = "grab";
      } else {
        mapInstance.getCanvas().style.cursor = "crosshair";
      }

      if (pointsRef.current.length >= 1) {
        updateMapVisualization();
      }
    };

    mapInstance.on("mousedown", onMouseDown);
    mapInstance.on("mouseup", onMouseUp);
    mapInstance.on("click", onClick);
    mapInstance.on("mousemove", onMouseMove);

    // Also handle mouseup on document in case mouse leaves map
    const onDocumentMouseUp = () => {
      if (draggingIndexRef.current !== null) {
        draggingIndexRef.current = null;
        mapInstance.dragPan.enable();
        if (mapInstance.getCanvas()) {
          mapInstance.getCanvas().style.cursor = "crosshair";
        }
      }
    };
    document.addEventListener("mouseup", onDocumentMouseUp);

    return () => {
      mapInstance.off("mousedown", onMouseDown);
      mapInstance.off("mouseup", onMouseUp);
      mapInstance.off("click", onClick);
      mapInstance.off("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onDocumentMouseUp);
    };
  }, [
    mapInstance,
    isDrawingMode,
    completePolygon,
    updateMapVisualization,
    findVertexAt,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isDrawingMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelDrawing();
      } else if (e.key === "Enter" && pointsRef.current.length >= 3) {
        completePolygon();
      } else if (
        (e.key === "z" && (e.ctrlKey || e.metaKey)) ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
        undoPoint();
        updateMapVisualization();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isDrawingMode,
    cancelDrawing,
    completePolygon,
    undoPoint,
    updateMapVisualization,
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
        Click to add points. Drag points to adjust.
      </Text>
      <Text size="xs" c="dimmed" mb="sm">
        Esc to cancel • Ctrl+Z to undo • {pointsCount} point
        {pointsCount !== 1 ? "s" : ""}
      </Text>
      <Group justify="center">
        <Button
          size="sm"
          variant="filled"
          radius="md"
          leftSection={<IconArrowBackUp size={16} />}
          onClick={() => {
            undoPoint();
            updateMapVisualization();
          }}
          disabled={pointsCount === 0}
        >
          Undo
        </Button>
        <Button
          variant="filled"
          size="sm"
          radius="md"
          leftSection={<IconCheck size={16} />}
          onClick={completePolygon}
          disabled={pointsCount < 3}
        >
          Complete
        </Button>
        <Button
          size="sm"
          variant="light"
          radius="md"
          color="rose"
          className="menu-item-color-dark-red"
          leftSection={<IconX size={16} />}
          onClick={cancelDrawing}
        >
          Cancel
        </Button>
      </Group>
    </Paper>
  );
}

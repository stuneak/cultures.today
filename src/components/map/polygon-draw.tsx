"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Button, Paper, Text, Group } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
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
  const sourceId = "drawing-polygon";

  const updatePolygonOnMap = useCallback(() => {
    if (!mapInstance || pointsRef.current.length < 2) return;

    const coordinates = pointsRef.current.map((p) => [p.lng, p.lat]);
    // Close the polygon if we have 3+ points
    if (pointsRef.current.length >= 3) {
      coordinates.push(coordinates[0]);
    }

    const geojson: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry:
        pointsRef.current.length >= 3
          ? { type: "Polygon", coordinates: [coordinates] }
          : { type: "LineString", coordinates },
    };

    const source = mapInstance.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
  }, [mapInstance]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!isDrawingMode) return;
      pointsRef.current.push(e.lngLat);
      setPointsCount(pointsRef.current.length);
      updatePolygonOnMap();
    },
    [isDrawingMode, updatePolygonOnMap],
  );

  const handleComplete = useCallback(() => {
    if (pointsRef.current.length < 3) return;

    const coordinates = pointsRef.current.map((p) => [p.lng, p.lat]);
    coordinates.push(coordinates[0]); // Close polygon

    const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    };

    setDrawnPolygon(polygon);
    setIsDrawingMode(false);
    onComplete(polygon);
  }, [onComplete, setDrawnPolygon, setIsDrawingMode]);

  const handleCancel = useCallback(() => {
    pointsRef.current = [];
    setPointsCount(0);
    setIsDrawingMode(false);
    setDrawnPolygon(null);

    // Remove drawing layers
    if (mapInstance) {
      if (mapInstance.getLayer("drawing-polygon-fill")) {
        mapInstance.removeLayer("drawing-polygon-fill");
      }
      if (mapInstance.getLayer("drawing-polygon-line")) {
        mapInstance.removeLayer("drawing-polygon-line");
      }
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }
    }

    onCancel();
  }, [mapInstance, onCancel, setIsDrawingMode, setDrawnPolygon]);

  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const setupDrawing = () => {
      // Add source for drawing
      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        mapInstance.addLayer({
          id: "drawing-polygon-fill",
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.3,
          },
        });

        mapInstance.addLayer({
          id: "drawing-polygon-line",
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });
      }

      mapInstance.on("click", handleMapClick);
      mapInstance.getCanvas().style.cursor = "crosshair";
    };

    // Wait for the map style to be loaded before adding sources/layers
    if (mapInstance.isStyleLoaded()) {
      setupDrawing();
    } else {
      mapInstance.once("style.load", setupDrawing);
    }

    return () => {
      mapInstance.off("click", handleMapClick);
      if (mapInstance.getCanvas()) {
        mapInstance.getCanvas().style.cursor = "";
      }
    };
  }, [mapInstance, isDrawingMode, handleMapClick]);

  if (!isDrawingMode) return null;

  return (
    <Paper
      className="fixed top-4 left-1/2 -translate-x-1/2 z-20"
      shadow="md"
      p="md"
      withBorder
    >
      <Text size="sm" mb="sm">
        Click on the map to draw your nation&apos;s boundary. Minimum 3 points
        required.
      </Text>
      <Group justify="center">
        <Button
          size="sm"
          leftSection={<IconCheck size={16} />}
          onClick={handleComplete}
          disabled={pointsCount < 3}
        >
          Complete
        </Button>
        <Button
          size="sm"
          variant="light"
          color="red"
          leftSection={<IconX size={16} />}
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </Group>
    </Paper>
  );
}

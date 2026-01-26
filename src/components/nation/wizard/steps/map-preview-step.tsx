"use client";

import { useEffect, useRef } from "react";
import { Stack, Text, Card } from "@mantine/core";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { WizardFormData } from "../types";

interface MapPreviewStepProps {
  data: WizardFormData;
}

export function MapPreviewStep({ data }: MapPreviewStepProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const boundary: GeoJSON.Feature<GeoJSON.MultiPolygon> | null =
    data.boundaryGeoJson ? JSON.parse(data.boundaryGeoJson) : null;

  const polygonCount = boundary?.geometry?.coordinates?.length ?? 0;

  useEffect(() => {
    if (!mapContainerRef.current || !boundary) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [0, 20],
      zoom: 2,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add the boundary source
      map.addSource("boundary", {
        type: "geojson",
        data: boundary,
      });

      // Add fill layer
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.3,
        },
      });

      // Add stroke layer
      map.addLayer({
        id: "boundary-stroke",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": "#2563eb",
          "line-width": 2,
        },
      });

      // Fit map to boundary
      const coords = boundary.geometry.coordinates.flat(2);
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);

      const bounds = new maplibregl.LngLatBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      );

      map.fitBounds(bounds, { padding: 40 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [boundary]);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Review your nation&apos;s territory boundaries below.
      </Text>

      <Card withBorder p={0} className="overflow-hidden">
        <div ref={mapContainerRef} style={{ height: 300, width: "100%" }} />
      </Card>

      <Text size="sm" c="dimmed">
        {polygonCount} polygon{polygonCount !== 1 ? "s" : ""} drawn
      </Text>
    </Stack>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map, MapMouseEvent, LngLat } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-styles.css";
import { useMapStore } from "@/stores/map-store";

interface NationAtPoint {
  id: string;
  name: string;
  slug: string;
  flagUrl: string | null;
}

interface WorldMapProps {
  onNationClick: (slug: string) => void;
  onMultipleNationsAtPoint: (nations: NationAtPoint[], lngLat: LngLat) => void;
}

export function WorldMap({
  onNationClick,
  onMultipleNationsAtPoint,
}: WorldMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setMapInstance, setIsMapReady } = useMapStore();

  // Store callbacks in refs to avoid re-running useEffect
  const onNationClickRef = useRef(onNationClick);
  const onMultipleNationsRef = useRef(onMultipleNationsAtPoint);

  useEffect(() => {
    onNationClickRef.current = onNationClick;
    onMultipleNationsRef.current = onMultipleNationsAtPoint;
  }, [onNationClick, onMultipleNationsAtPoint]);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapStyle =
      process.env.NEXT_PUBLIC_MAP_STYLE ||
      "https://tiles.openfreemap.org/styles/liberty";

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [9.753, 50.6844],
      zoom: 6,
      minZoom: 3,
      maxZoom: 18,
    });

    const mapInstance = map.current;

    // Store map instance
    setMapInstance(mapInstance);

    mapInstance.on("load", async () => {
      try {
        const response = await fetch("/api/nations/geojson");
        const geojson = await response.json();

        mapInstance.setProjection({ type: "globe" });

        mapInstance.addSource("nations", {
          type: "geojson",
          data: geojson,
        });

        // Add fill layer for nation boundaries
        mapInstance.addLayer({
          id: "nations-fill",
          type: "fill",
          source: "nations",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.2,
          },
        });

        // Add outline layer
        mapInstance.addLayer({
          id: "nations-outline",
          type: "line",
          source: "nations",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        });

        // Hover effects
        mapInstance.on("mouseenter", "nations-fill", () => {
          mapInstance.getCanvas().style.cursor = "pointer";
        });

        mapInstance.on("mouseleave", "nations-fill", () => {
          mapInstance.getCanvas().style.cursor = "";
        });

        setIsLoading(false);
        setIsMapReady(true);
      } catch (error) {
        console.error("Failed to load nations GeoJSON:", error);
        setIsLoading(false);
        setIsMapReady(true);
      }
    });

    // Add navigation controls
    mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      setIsMapReady(false);
      setMapInstance(null);
      mapInstance.remove();
      map.current = null;
    };
  }, [setMapInstance, setIsMapReady]);

  // Separate effect for click handler that depends on isDrawingMode
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance) return;

    const handleMapClick = async (e: MapMouseEvent) => {
      // Skip if in drawing mode - let PolygonDraw handle clicks
      if (useMapStore.getState().isDrawingMode) return;

      const { lng, lat } = e.lngLat;

      try {
        const response = await fetch(
          `/api/nations/at-point?lng=${lng}&lat=${lat}`,
        );
        const data = await response.json();

        if (data.nations && data.nations.length > 0) {
          if (data.nations.length === 1) {
            onNationClickRef.current(data.nations[0].slug);
          } else {
            onMultipleNationsRef.current(data.nations, e.lngLat);
          }
        }
      } catch (error) {
        console.error("Failed to query nations at point:", error);
      }
    };

    mapInstance.on("click", handleMapClick);

    return () => {
      mapInstance.off("click", handleMapClick);
    };
  }, []);

  return (
    <div className="relative w-full h-full" style={{ minHeight: "400px" }}>
      <div ref={mapContainer} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
}

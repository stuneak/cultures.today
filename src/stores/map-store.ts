import { create } from "zustand";
import type { Map } from "maplibre-gl";

interface MapState {
  mapInstance: Map | null;
  isDrawingMode: boolean;
  drawnPolygons: GeoJSON.Feature<GeoJSON.Polygon>[];
  setMapInstance: (map: Map | null) => void;
  setIsDrawingMode: (isDrawing: boolean) => void;
  addDrawnPolygon: (polygon: GeoJSON.Feature<GeoJSON.Polygon>) => void;
  removeDrawnPolygon: (index: number) => void;
  clearDrawnPolygons: () => void;
  getMultiPolygon: () => GeoJSON.Feature<GeoJSON.MultiPolygon> | null;
  zoomIn: () => void;
  zoomOut: () => void;
  locateMe: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  mapInstance: null,
  isDrawingMode: false,
  drawnPolygons: [],
  setMapInstance: (map) => set({ mapInstance: map }),
  setIsDrawingMode: (isDrawing) => set({ isDrawingMode: isDrawing }),
  addDrawnPolygon: (polygon) =>
    set((state) => ({ drawnPolygons: [...state.drawnPolygons, polygon] })),
  removeDrawnPolygon: (index) =>
    set((state) => ({
      drawnPolygons: state.drawnPolygons.filter((_, i) => i !== index),
    })),
  clearDrawnPolygons: () => set({ drawnPolygons: [] }),
  getMultiPolygon: () => {
    const { drawnPolygons } = get();
    if (drawnPolygons.length === 0) return null;
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: drawnPolygons.map((p) => p.geometry.coordinates),
      },
    };
  },
  zoomIn: () => {
    const { mapInstance } = get();
    if (mapInstance) {
      mapInstance.zoomIn({ duration: 300 });
    }
  },
  zoomOut: () => {
    const { mapInstance } = get();
    if (mapInstance) {
      mapInstance.zoomOut({ duration: 300 });
    }
  },
  locateMe: () => {
    const { mapInstance } = get();
    if (mapInstance && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapInstance.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 10,
            duration: 2000,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  },
}));

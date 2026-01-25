import { create } from "zustand";
import type { Map } from "maplibre-gl";

interface MapState {
  mapInstance: Map | null;
  isDrawingMode: boolean;
  drawnPolygon: GeoJSON.Feature<GeoJSON.Polygon> | null;
  setMapInstance: (map: Map | null) => void;
  setIsDrawingMode: (isDrawing: boolean) => void;
  setDrawnPolygon: (polygon: GeoJSON.Feature<GeoJSON.Polygon> | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  locateMe: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  mapInstance: null,
  isDrawingMode: false,
  drawnPolygon: null,
  setMapInstance: (map) => set({ mapInstance: map }),
  setIsDrawingMode: (isDrawing) => set({ isDrawingMode: isDrawing }),
  setDrawnPolygon: (polygon) => set({ drawnPolygon: polygon }),
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

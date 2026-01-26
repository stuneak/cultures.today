import { create } from "zustand";
import type { Map } from "maplibre-gl";

interface MapState {
  mapInstance: Map | null;
  isDrawingMode: boolean;
  currentPolygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
  polygonHistory: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  brushMode: "add" | "erase";
  brushSize: number; // 0-100 slider value
  setMapInstance: (map: Map | null) => void;
  setIsDrawingMode: (isDrawing: boolean) => void;
  setCurrentPolygon: (polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null) => void;
  pushToHistory: (polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>) => void;
  undo: () => void;
  clearDrawing: () => void;
  setBrushMode: (mode: "add" | "erase") => void;
  setBrushSize: (size: number) => void;
  getMultiPolygon: () => GeoJSON.Feature<GeoJSON.MultiPolygon> | null;
  zoomIn: () => void;
  zoomOut: () => void;
  locateMe: () => void;
}

const MAX_HISTORY = 50;

export const useMapStore = create<MapState>((set, get) => ({
  mapInstance: null,
  isDrawingMode: false,
  currentPolygon: null,
  polygonHistory: [],
  brushMode: "add",
  brushSize: 50, // Default to middle
  setMapInstance: (map) => set({ mapInstance: map }),
  setIsDrawingMode: (isDrawing) =>
    set({
      isDrawingMode: isDrawing,
      currentPolygon: isDrawing ? null : get().currentPolygon,
      polygonHistory: isDrawing ? [] : get().polygonHistory,
      brushMode: "add",
    }),
  setCurrentPolygon: (polygon) => set({ currentPolygon: polygon }),
  pushToHistory: (polygon) =>
    set((state) => ({
      polygonHistory: [...state.polygonHistory.slice(-MAX_HISTORY + 1), polygon],
    })),
  undo: () =>
    set((state) => {
      if (state.polygonHistory.length === 0) return state;
      const newHistory = [...state.polygonHistory];
      newHistory.pop();
      const previousPolygon = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
      return {
        polygonHistory: newHistory,
        currentPolygon: previousPolygon,
      };
    }),
  clearDrawing: () => set({ currentPolygon: null, polygonHistory: [], brushMode: "add" }),
  setBrushMode: (mode) => set({ brushMode: mode }),
  setBrushSize: (size) => set({ brushSize: Math.max(0, Math.min(100, size)) }),
  getMultiPolygon: () => {
    const { currentPolygon } = get();
    if (!currentPolygon) return null;
    if (currentPolygon.geometry.type === "MultiPolygon") {
      return currentPolygon as GeoJSON.Feature<GeoJSON.MultiPolygon>;
    }
    // Convert Polygon to MultiPolygon
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [currentPolygon.geometry.coordinates],
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

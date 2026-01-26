# Brush-Based Polygon Drawing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace vertex-based polygon drawing with a brush-stamp approach where clicks add/subtract circles that merge into the final polygon.

**Architecture:** Replace PolygonDraw component with BrushDraw component. Use Turf.js for geometry operations (circle creation, union, difference). Store single polygon + undo history instead of array of polygons.

**Tech Stack:** React, Zustand, MapLibre GL, Turf.js (@turf/circle, @turf/union, @turf/difference, @turf/helpers)

---

### Task 1: Install Turf.js Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install turf packages**

Run:
```bash
npm install @turf/circle @turf/union @turf/difference @turf/helpers
```

**Step 2: Verify installation**

Run: `npm ls @turf/circle`
Expected: Shows @turf/circle in dependency tree

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add turf.js dependencies for brush drawing"
```

---

### Task 2: Update Map Store for Brush Drawing

**Files:**
- Modify: `src/stores/map-store.ts`

**Step 1: Update store interface and implementation**

Replace the entire file content with:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/stores/map-store.ts
git commit -m "refactor: update map store for brush-based drawing"
```

---

### Task 3: Create Brush Draw Component - Core Structure

**Files:**
- Create: `src/components/map/brush-draw.tsx`

**Step 1: Create the component with imports and interface**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/map/brush-draw.tsx
git commit -m "feat: add BrushDraw component for stamp-based drawing"
```

---

### Task 4: Update Main Page to Use BrushDraw

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Read current page.tsx**

Check the current imports and how PolygonDraw is used.

**Step 2: Replace PolygonDraw with BrushDraw**

Change the import from:
```typescript
import { PolygonDraw } from "@/components/map/polygon-draw";
```
to:
```typescript
import { BrushDraw } from "@/components/map/brush-draw";
```

Replace the component usage from:
```typescript
<PolygonDraw onComplete={...} onCancel={...} />
```
to:
```typescript
<BrushDraw onComplete={...} onCancel={...} />
```

**Step 3: Update store usage**

Change `clearDrawnPolygons` to `clearDrawing` in the cancel handler.

**Step 4: Verify app runs**

Run: `npm run dev`
Expected: App starts without errors, drawing mode works

**Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: switch to BrushDraw component on main page"
```

---

### Task 5: Delete Old PolygonDraw Component

**Files:**
- Delete: `src/components/map/polygon-draw.tsx`

**Step 1: Verify BrushDraw works correctly**

Manually test:
- Click "+" to enter drawing mode
- Click on map to stamp circles
- Toggle to erase mode
- Erase part of the polygon
- Adjust brush size with slider and +/- buttons
- Test keyboard shortcuts: B, E, [, ], Ctrl+Z, Escape, Enter
- Complete drawing and verify wizard receives polygon

**Step 2: Delete the old file**

```bash
rm src/components/map/polygon-draw.tsx
```

**Step 3: Verify no import errors**

Run: `npx tsc --noEmit`
Expected: No errors (no remaining imports of PolygonDraw)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old PolygonDraw component"
```

---

### Task 6: Final Testing and Cleanup

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Test complete flow**

1. Start drawing mode
2. Stamp several circles to create a shape
3. Switch to erase mode
4. Erase part of the shape
5. Undo a few times
6. Finish drawing
7. Verify wizard shows correct polygon preview
8. Submit and verify backend receives valid GeoJSON

**Step 3: Commit any final fixes**

If any issues found, fix and commit.

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `package.json` | Add turf.js dependencies |
| `src/stores/map-store.ts` | Rewrite for brush mode state |
| `src/components/map/brush-draw.tsx` | New component |
| `src/app/page.tsx` | Switch to BrushDraw |
| `src/components/map/polygon-draw.tsx` | Delete |

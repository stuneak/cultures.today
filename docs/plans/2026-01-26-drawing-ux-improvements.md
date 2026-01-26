# Drawing UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the drawing experience with vertical slider, smoother painting, better default brush size, and clearer UI hints.

**Architecture:** Modify existing components - DrawingControls for slider orientation, BrushDraw for smooth painting (single stamp on mousedown), DrawingHints for dynamic context-aware messages, and map-store for reset-to-drawing mode.

**Tech Stack:** React, Zustand, Mantine UI, MapLibre GL, Turf.js

---

## Task 1: Make Slider Vertical and Bigger

**Files:**
- Modify: `src/components/controls/drawing-controls.tsx:126-143`
- Modify: `src/components/controls/drawing-controls.css`

**Step 1: Update slider to vertical orientation**

In `drawing-controls.tsx`, change the slider section (around line 127-143):

```tsx
{/* Slider - only in draw mode */}
{!showMode && (
  <div className="brush-slider-container">
    <Slider
      value={brushSize}
      onChange={onBrushSizeChange}
      min={0}
      max={100}
      step={1}
      orientation="vertical"
      size="lg"
      label={formatBrushSize}
      labelAlwaysOn={false}
    />
    <Text size="xs" ta="center" c="dimmed" mt={8}>
      {formatBrushSize(brushSize)}
    </Text>
  </div>
)}
```

**Step 2: Add CSS for vertical slider**

Add to `drawing-controls.css`:

```css
.brush-slider-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  pointer-events: auto;
}

.brush-slider-container .mantine-Slider-root {
  height: 120px;
}
```

**Step 3: Verify visually**

Run: `npm run dev`
Expected: Slider is now vertical, approximately 120px tall, with size text below

**Step 4: Commit**

```bash
git add src/components/controls/drawing-controls.tsx src/components/controls/drawing-controls.css
git commit -m "feat: make brush size slider vertical and bigger"
```

---

## Task 2: Reset to Drawing Mode When Clicking Paint

**Files:**
- Modify: `src/stores/map-store.ts:35-41`
- Modify: `src/components/map/brush-draw.tsx:52`

**Step 1: Add showMode to store state**

In `map-store.ts`, add `showMode` to the interface and state (around line 10):

```typescript
interface MapState {
  mapInstance: Map | null;
  isDrawingMode: boolean;
  showMode: boolean; // false = draw mode, true = pan mode
  currentPolygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
  polygonHistory: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  brushMode: "add" | "erase";
  brushSize: number;
  setMapInstance: (map: Map | null) => void;
  setIsDrawingMode: (isDrawing: boolean) => void;
  setShowMode: (show: boolean) => void;
  // ... rest of interface
}
```

Add initial state and setter (around line 30):

```typescript
showMode: false,
setShowMode: (show) => set({ showMode: show }),
```

**Step 2: Reset showMode to false when entering drawing mode**

In `map-store.ts`, update `setIsDrawingMode` (around line 35):

```typescript
setIsDrawingMode: (isDrawing) =>
  set({
    isDrawingMode: isDrawing,
    currentPolygon: isDrawing ? null : get().currentPolygon,
    polygonHistory: isDrawing ? [] : get().polygonHistory,
    brushMode: "add",
    showMode: false, // Always start in drawing mode
  }),
```

**Step 3: Use store's showMode in BrushDraw**

In `brush-draw.tsx`, replace local `useState` with store (around line 52):

Remove:
```typescript
const [showMode, setShowMode] = useState(false);
```

Add to destructuring from useMapStore:
```typescript
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
```

**Step 4: Verify behavior**

Run: `npm run dev`
Click "Paint" button, should start in drawing mode (crosshair cursor), not pan mode.

**Step 5: Commit**

```bash
git add src/stores/map-store.ts src/components/map/brush-draw.tsx
git commit -m "feat: reset to drawing mode when clicking Paint button"
```

---

## Task 3: Change Minimum Brush Size to 1km, Default to 5km

**Files:**
- Modify: `src/components/map/brush-draw.tsx:19-24`
- Modify: `src/stores/map-store.ts:33`

**Step 1: Update slider-to-radius conversion**

In `brush-draw.tsx`, change `sliderToRadius` function (lines 19-25):

```typescript
// Convert slider value (0-100) to radius in kilometers
function sliderToRadius(value: number): number {
  // Exponential scale: 1km at 0, ~200km at 100
  const minRadius = 1;
  const maxRadius = 200;
  const t = value / 100;
  return minRadius + (maxRadius - minRadius) * (t * t); // Quadratic for finer control at small sizes
}
```

**Step 2: Update default brush size for 5km**

In `map-store.ts`, change default brushSize (line 33).

With quadratic formula: radius = 1 + 199 * (t^2)
For 5km: 5 = 1 + 199 * t^2 → t^2 = 4/199 → t ≈ 0.1418 → value ≈ 14

```typescript
brushSize: 14, // Default to ~5km
```

**Step 3: Verify the values**

Run: `npm run dev`
- At slider value 0: should show "1km"
- At slider value 14: should show "5km"
- At slider value 100: should show "200km"

**Step 4: Commit**

```bash
git add src/components/map/brush-draw.tsx src/stores/map-store.ts
git commit -m "feat: minimum brush 1km, default 5km"
```

---

## Task 4: Fix Laggy Drawing - Single Paint on MouseDown

**Files:**
- Modify: `src/components/map/brush-draw.tsx:276-302`

**Step 1: Update mousedown and mousemove handlers**

The issue is that on mousedown AND every mousemove, it stamps circles creating massive lag from union operations. Change to only stamp on mousedown (single click = single stamp), then continuous drag paints over.

Replace the event handlers (around lines 276-302):

```typescript
const lastStampPosRef = useRef<{ lng: number; lat: number } | null>(null);

// In the useEffect for map events:
const onMouseDown = (e: MapMouseEvent) => {
  if (showMode) {
    return;
  }
  isMouseDownRef.current = true;
  lastStampPosRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
  handleStamp(e.lngLat.lng, e.lngLat.lat);
  mapInstance.dragPan.disable();
};

const onMouseUp = () => {
  if (showMode) return;
  isMouseDownRef.current = false;
  lastStampPosRef.current = null;
  mapInstance.dragPan.enable();
};

const onMouseMove = (e: MapMouseEvent) => {
  cursorPosRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };

  if (!showMode) {
    updateCursorPreview();
    // Only stamp if mouse is held AND moved enough distance
    if (isMouseDownRef.current && lastStampPosRef.current) {
      const dx = e.lngLat.lng - lastStampPosRef.current.lng;
      const dy = e.lngLat.lat - lastStampPosRef.current.lat;
      // Rough distance in degrees - stamp every ~half brush radius
      const minDistance = radiusKm * 0.005; // Approximate degrees per km
      if (Math.sqrt(dx * dx + dy * dy) > minDistance) {
        handleStamp(e.lngLat.lng, e.lngLat.lat);
        lastStampPosRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      }
    }
  }
};
```

**Step 2: Add the ref at component level**

Add near other refs (around line 50):

```typescript
const lastStampPosRef = useRef<{ lng: number; lat: number } | null>(null);
```

**Step 3: Add radiusKm to effect dependencies**

Update the dependency array of the map events useEffect to include `radiusKm`.

**Step 4: Test drawing smoothness**

Run: `npm run dev`
- Single click should place one circle
- Dragging should paint smooth line without excessive overlapping stamps
- Performance should be noticeably better

**Step 5: Commit**

```bash
git add src/components/map/brush-draw.tsx
git commit -m "fix: reduce lag by throttling stamp frequency based on brush size"
```

---

## Task 5: Move Pan/Draw Toggle to Center

**Files:**
- Modify: `src/components/controls/drawing-controls.tsx`
- Modify: `src/components/map/brush-draw.tsx`
- Modify: `src/components/controls/drawing-hints.tsx`

**Step 1: Remove Pan/Draw toggle from DrawingControls**

In `drawing-controls.tsx`, remove the Pan/Draw Toggle button (lines 73-87).

Remove these props from interface:
```typescript
showMode: boolean;
onShowModeChange: (showMode: boolean) => void;
```

**Step 2: Add Pan/Draw toggle to DrawingHints**

In `drawing-hints.tsx`, add the toggle button:

```tsx
"use client";

import { Paper, Text, ActionIcon, Tooltip } from "@mantine/core";
import { IconHandGrab, IconBrush } from "@tabler/icons-react";

interface DrawingHintsProps {
  showMode: boolean;
  onShowModeChange: (showMode: boolean) => void;
  brushMode: "add" | "erase";
}

export function DrawingHints({ showMode, onShowModeChange, brushMode }: DrawingHintsProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
      {/* Mode Toggle Button */}
      <Tooltip label={showMode ? "Switch to Draw (S)" : "Switch to Pan (S)"} position="bottom">
        <ActionIcon
          variant="filled"
          size="xl"
          radius="xl"
          color={showMode ? "gray" : "blue"}
          onClick={() => onShowModeChange(!showMode)}
        >
          {showMode ? <IconHandGrab size={24} /> : <IconBrush size={24} />}
        </ActionIcon>
      </Tooltip>

      {/* Hints Panel */}
      <Paper shadow="sm" p="xs" withBorder>
        <Text size="sm" ta="center" fw={500}>
          {showMode ? "🖐️ Panning" : brushMode === "add" ? "🖌️ Drawing" : "🧹 Erasing"}
        </Text>
        <Text size="xs" c="dimmed" ta="center" mt={4}>
          {showMode
            ? "Pan/zoom the map. Press S to draw."
            : brushMode === "add"
              ? "Click and drag to paint. W: erase, S: pan"
              : "Click and drag to erase. W: draw, S: pan"}
        </Text>
      </Paper>
    </div>
  );
}
```

**Step 3: Update BrushDraw to pass new props**

In `brush-draw.tsx`, update the DrawingHints usage:

```tsx
<DrawingHints
  showMode={showMode}
  onShowModeChange={setShowMode}
  brushMode={brushMode}
/>
```

**Step 4: Update DrawingControls usage**

In `brush-draw.tsx`, remove showMode props from DrawingControls:

```tsx
<DrawingControls
  brushMode={brushMode}
  onBrushModeChange={setBrushMode}
  brushSize={brushSize}
  onBrushSizeChange={setBrushSize}
  onUndo={handleUndo}
  onFinish={finishDrawing}
  onCancel={cancelDrawing}
  canUndo={!!currentPolygon}
  canFinish={!!currentPolygon}
  formatBrushSize={formatBrushSize}
/>
```

**Step 5: Verify layout**

Run: `npm run dev`
- Pan/Draw toggle should be centered at top of screen
- Left sidebar should no longer have the toggle
- Clicking toggle or pressing S should switch modes

**Step 6: Commit**

```bash
git add src/components/controls/drawing-controls.tsx src/components/controls/drawing-hints.tsx src/components/map/brush-draw.tsx
git commit -m "feat: move pan/draw toggle to center, update hints with current state"
```

---

## Task 6: Update DrawingHints Text Based on State

This is already done in Task 5. The text now shows:
- Current mode (Panning/Drawing/Erasing) with emoji
- Instructions based on current state
- How to switch to other modes

**Step 1: Verify the dynamic text**

Run: `npm run dev`
- In draw mode: "🖌️ Drawing" + "Click and drag to paint. W: erase, S: pan"
- In erase mode: "🧹 Erasing" + "Click and drag to erase. W: draw, S: pan"
- In pan mode: "🖐️ Panning" + "Pan/zoom the map. Press S to draw."

**Step 2: Commit (if not already)**

Already included in Task 5 commit.

---

## Summary of Changes

1. **Vertical Slider** - Changed slider orientation to vertical with 120px height
2. **Reset to Drawing** - Store now resets showMode to false when Paint is clicked
3. **Brush Size** - Minimum 1km (was 100m), default 5km (was middle of range)
4. **Smooth Drawing** - Throttled stamps based on brush size to reduce lag
5. **Center Toggle** - Pan/Draw toggle moved from left sidebar to center top
6. **Dynamic Hints** - Text changes based on current state (drawing/erasing/panning)

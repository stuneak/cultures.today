# Drawing Controls Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move drawing controls from the centered modal to a left-side vertical control panel matching the MainPageControls pattern, with a top center keyboard shortcuts hint bar.

**Architecture:** Split BrushDraw UI into two components: (1) DrawingControls sidebar on the left with ActionIcon buttons for Pan/Draw toggle, Add/Erase toggle, size controls with slider, Undo, Finish, and Cancel; (2) DrawingHints bar at top center showing keyboard shortcuts. Keep all drawing logic in BrushDraw but extract the UI to these dedicated components.

**Tech Stack:** React, Mantine (ActionIcon, Tooltip, Slider, SegmentedControl), Tabler Icons

---

### Task 1: Create DrawingControls Component

**Files:**
- Create: `src/components/controls/drawing-controls.tsx`
- Create: `src/components/controls/drawing-controls.css`

**Step 1: Create the CSS file for drawing controls**

```css
.drawing-controls-container {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  pointer-events: none;
  z-index: 20;

  & nav {
    pointer-events: auto;
  }
}
```

**Step 2: Create the DrawingControls component**

```typescript
"use client";

import { ActionIcon, Tooltip, Slider, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconHandGrab,
  IconBrush,
  IconEraser,
  IconMinus,
  IconPlus,
  IconArrowBackUp,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import "./drawing-controls.css";

const toolTipStyles = {
  position: "right" as const,
  openDelay: 500,
};

interface DrawingControlsProps {
  showMode: boolean;
  onShowModeChange: (showMode: boolean) => void;
  brushMode: "add" | "erase";
  onBrushModeChange: (mode: "add" | "erase") => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onFinish: () => void;
  onCancel: () => void;
  canUndo: boolean;
  canFinish: boolean;
  formatBrushSize: (value: number) => string;
}

function useIconStyles() {
  const isMobile = useMediaQuery("(max-width: 600px)");

  const actionIconStyles = {
    variant: "main-page-control" as const,
    size: isMobile ? ("lg" as const) : ("xl" as const),
    radius: "lg" as const,
  };

  const iconStyles = {
    size: isMobile ? 20 : 24,
    stroke: 1.5,
  };
  return { actionIconStyles, iconStyles };
}

export function DrawingControls({
  showMode,
  onShowModeChange,
  brushMode,
  onBrushModeChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onFinish,
  onCancel,
  canUndo,
  canFinish,
  formatBrushSize,
}: DrawingControlsProps) {
  const { actionIconStyles, iconStyles } = useIconStyles();

  return (
    <div className="drawing-controls-container ml-2">
      <nav>
        <ActionIcon.Group orientation="vertical">
          {/* Pan/Draw Toggle */}
          <Tooltip {...toolTipStyles} label={showMode ? "Pan mode (S)" : "Draw mode (S)"}>
            <ActionIcon
              {...actionIconStyles}
              onClick={() => onShowModeChange(!showMode)}
              aria-label={showMode ? "Switch to draw" : "Switch to pan"}
              color={showMode ? "gray" : "blue"}
            >
              {showMode ? (
                <IconHandGrab {...iconStyles} />
              ) : (
                <IconBrush {...iconStyles} />
              )}
            </ActionIcon>
          </Tooltip>

          {/* Add/Erase Toggle - only in draw mode */}
          {!showMode && (
            <Tooltip
              {...toolTipStyles}
              label={brushMode === "add" ? "Add mode (W)" : "Erase mode (W)"}
            >
              <ActionIcon
                {...actionIconStyles}
                onClick={() =>
                  onBrushModeChange(brushMode === "add" ? "erase" : "add")
                }
                aria-label={brushMode === "add" ? "Switch to erase" : "Switch to add"}
                color={brushMode === "add" ? "blue" : "red"}
              >
                {brushMode === "add" ? (
                  <IconBrush {...iconStyles} />
                ) : (
                  <IconEraser {...iconStyles} />
                )}
              </ActionIcon>
            </Tooltip>
          )}

          {/* Size decrease - only in draw mode */}
          {!showMode && (
            <Tooltip {...toolTipStyles} label="Decrease size ([)">
              <ActionIcon
                {...actionIconStyles}
                onClick={() => onBrushSizeChange(brushSize - 10)}
                disabled={brushSize <= 0}
                aria-label="Decrease brush size"
              >
                <IconMinus {...iconStyles} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Slider - only in draw mode */}
          {!showMode && (
            <div className="py-2 px-1" style={{ pointerEvents: "auto" }}>
              <Slider
                value={brushSize}
                onChange={onBrushSizeChange}
                min={0}
                max={100}
                step={1}
                orientation="vertical"
                h={100}
                label={formatBrushSize}
                labelAlwaysOn={false}
              />
              <Text size="xs" ta="center" mt={4} c="dimmed">
                {formatBrushSize(brushSize)}
              </Text>
            </div>
          )}

          {/* Size increase - only in draw mode */}
          {!showMode && (
            <Tooltip {...toolTipStyles} label="Increase size (])">
              <ActionIcon
                {...actionIconStyles}
                onClick={() => onBrushSizeChange(brushSize + 10)}
                disabled={brushSize >= 100}
                aria-label="Increase brush size"
              >
                <IconPlus {...iconStyles} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Undo */}
          <Tooltip {...toolTipStyles} label="Undo (Ctrl+Z)">
            <ActionIcon
              {...actionIconStyles}
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <IconArrowBackUp {...iconStyles} />
            </ActionIcon>
          </Tooltip>

          {/* Finish */}
          <Tooltip {...toolTipStyles} label="Finish (Enter)">
            <ActionIcon
              {...actionIconStyles}
              onClick={onFinish}
              disabled={!canFinish}
              aria-label="Finish drawing"
              color="green"
            >
              <IconCheck {...iconStyles} />
            </ActionIcon>
          </Tooltip>

          {/* Cancel */}
          <Tooltip {...toolTipStyles} label="Cancel (Esc)">
            <ActionIcon
              {...actionIconStyles}
              onClick={onCancel}
              aria-label="Cancel drawing"
              color="red"
            >
              <IconX {...iconStyles} />
            </ActionIcon>
          </Tooltip>
        </ActionIcon.Group>
      </nav>
    </div>
  );
}
```

**Step 3: Verify file was created correctly**

Run: `cat src/components/controls/drawing-controls.tsx | head -20`
Expected: Shows the imports and interface definition

**Step 4: Commit**

```bash
git add src/components/controls/drawing-controls.tsx src/components/controls/drawing-controls.css
git commit -m "feat: add DrawingControls sidebar component"
```

---

### Task 2: Create DrawingHints Component

**Files:**
- Create: `src/components/controls/drawing-hints.tsx`

**Step 1: Create the DrawingHints component**

```typescript
"use client";

import { Paper, Text } from "@mantine/core";

interface DrawingHintsProps {
  showMode: boolean;
}

export function DrawingHints({ showMode }: DrawingHintsProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <Paper shadow="sm" p="xs" withBorder>
        <Text size="xs" c="dimmed" ta="center">
          S: pan/draw • W: add/erase • [ / ]: resize • Ctrl+Z: undo • Enter: finish • Esc: cancel
        </Text>
        <Text size="sm" ta="center" mt={4}>
          {showMode
            ? "Pan/zoom the map. Press S to draw."
            : "Click and drag to paint. Press S to pan."}
        </Text>
      </Paper>
    </div>
  );
}
```

**Step 2: Verify file was created correctly**

Run: `cat src/components/controls/drawing-hints.tsx`
Expected: Shows the full component

**Step 3: Commit**

```bash
git add src/components/controls/drawing-hints.tsx
git commit -m "feat: add DrawingHints component for keyboard shortcut hints"
```

---

### Task 3: Update BrushDraw to Use New Components

**Files:**
- Modify: `src/components/map/brush-draw.tsx`

**Step 1: Read current BrushDraw implementation**

Review the current implementation focusing on the UI render section (lines 380-517).

**Step 2: Update imports**

Add imports at the top of brush-draw.tsx:

```typescript
import { DrawingControls } from "@/components/controls/drawing-controls";
import { DrawingHints } from "@/components/controls/drawing-hints";
```

Remove unused imports:
- `Button`, `Paper`, `Text`, `Group`, `Slider`, `SegmentedControl` from "@mantine/core"
- All icon imports except those still needed for map visualization

**Step 3: Add formatBrushSize helper**

Add this helper function after the `sliderToRadius` function:

```typescript
function formatBrushSize(value: number): string {
  const km = sliderToRadius(value);
  return km < 1 ? `${Math.round(km * 1000)}m` : `${Math.round(km)}km`;
}
```

**Step 4: Replace the render return statement**

Replace the entire return block (from `return (` to the final `);`) with:

```typescript
  if (!isDrawingMode) return null;

  return (
    <>
      <DrawingHints showMode={showMode} />
      <DrawingControls
        showMode={showMode}
        onShowModeChange={setShowMode}
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
    </>
  );
```

**Step 5: Verify the changes compile**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 6: Commit**

```bash
git add src/components/map/brush-draw.tsx
git commit -m "refactor: use DrawingControls and DrawingHints in BrushDraw"
```

---

### Task 4: Test the Implementation

**Files:**
- None (manual testing)

**Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Manual testing checklist**

Test the following in browser:
- [ ] Click "+" to enter drawing mode
- [ ] Verify left sidebar appears with controls
- [ ] Verify top center hints bar appears
- [ ] Click Pan/Draw toggle - verify it switches modes
- [ ] Click Add/Erase toggle - verify it switches brush modes
- [ ] Click +/- buttons - verify brush size changes
- [ ] Use slider - verify brush size changes
- [ ] Draw on map - verify stamps appear
- [ ] Click Undo - verify undo works
- [ ] Click Finish - verify drawing completes
- [ ] Re-enter drawing mode and click Cancel - verify it cancels

**Step 3: Test keyboard shortcuts**

- [ ] Press S - verify pan/draw toggle
- [ ] Press W - verify add/erase toggle
- [ ] Press [ and ] - verify size changes
- [ ] Press Ctrl+Z - verify undo
- [ ] Press Enter - verify finish
- [ ] Press Esc - verify cancel

**Step 4: Test responsive behavior**

- [ ] Resize window to mobile size
- [ ] Verify controls remain usable
- [ ] Verify icons resize appropriately

---

### Task 5: Final Cleanup and Polish

**Files:**
- Modify: `src/components/map/brush-draw.tsx` (if needed)
- Modify: `src/components/controls/drawing-controls.tsx` (if needed)

**Step 1: Remove any remaining unused code from brush-draw.tsx**

Clean up any imports that are no longer needed after removing the inline UI.

**Step 2: Verify no console warnings**

Run: `npm run dev`
Check browser console for warnings.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: cleanup unused imports in BrushDraw"
```

---

## Summary

| File | Change |
|------|--------|
| `src/components/controls/drawing-controls.tsx` | New - left sidebar with all controls |
| `src/components/controls/drawing-controls.css` | New - positioning styles |
| `src/components/controls/drawing-hints.tsx` | New - top center hints bar |
| `src/components/map/brush-draw.tsx` | Modified - use new components, remove inline UI |

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| S | Toggle Pan/Draw mode |
| W | Toggle Add/Erase mode |
| [ | Decrease brush size |
| ] | Increase brush size |
| Ctrl+Z | Undo |
| Enter | Finish drawing |
| Esc | Cancel drawing |

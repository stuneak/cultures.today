# Brush-Based Polygon Drawing

## Overview

Replace the current click-to-place-vertices polygon drawing with a brush-based "stamp" approach. Users click to stamp circles that merge into a polygon, with an eraser mode to subtract areas.

## Core Interaction Model

**Two brush modes:**
- **Add mode** (default) - Each click stamps a circle that merges into the polygon
- **Erase mode** - Each click stamps a circle that subtracts from the polygon

**Brush size:**
- Slider control with +/- buttons
- Range from small (~5km radius) to large (~200km radius)
- Visual preview: circle follows cursor showing brush size before clicking

**Drawing flow:**
1. User enters drawing mode (clicks "+" button)
2. Cursor becomes a circle preview showing brush size
3. Click anywhere → stamps a circle, creating initial polygon
4. Continue clicking → each stamp merges with existing shape
5. Toggle to eraser → clicks now subtract from the shape
6. Adjust slider → brush size changes, cursor preview updates
7. Click "Finish" → polygon is complete, passed to wizard

## Toolbar & UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Add (B)] [Erase (E)]                                       │
│                                                              │
│  [−]  ○───────●────○  [+]      Size slider with buttons     │
│                                                              │
│  [Undo]  [Finish]  [Cancel]                                 │
└──────────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:**

| Button | Keyboard |
|--------|----------|
| Add | `B` |
| Erase | `E` |
| − (smaller) | `[` |
| + (larger) | `]` |
| Undo | `Ctrl+Z` |
| Cancel | `Escape` |
| Finish | `Enter` |

**Cursor feedback:**
- Circle outline follows mouse, sized to match brush
- Add mode: blue circle outline
- Erase mode: red circle outline
- Circle scales with map zoom (represents same geographic area)

## Geometry & State Management

**How stamps become polygons:**
1. On first click - Create circle polygon using `turf.circle(center, radius)`
2. On subsequent Add clicks - Use `turf.union(existingPolygon, newCircle)` to merge
3. On Erase clicks - Use `turf.difference(existingPolygon, newCircle)` to subtract
4. Result - Always stored as GeoJSON Polygon or MultiPolygon

**Undo history:**
- Store array of polygon snapshots
- Each stamp pushes new state to history
- Undo pops last state and restores previous
- Limit history to ~50 states

**Brush size mapping:**
- Slider value: 0 to 100
- Maps to radius: ~5km to ~200km

**Visual layers:**
- Polygon fill: blue (#3b82f6) with 0.2 opacity
- Polygon outline: blue with width 3
- Cursor preview: blue outline (add) or red outline (erase)

## What Changes vs. Stays the Same

**Stays the same:**
- Entry point: "+" button starts drawing mode
- Exit flow: Finish → passes MultiPolygon to wizard
- Cancel flow: discards everything
- Map preview in wizard: unchanged
- GeoJSON format passed to backend: unchanged

**Removed:**
- Click-to-place vertices
- Vertex dragging
- "Close polygon by clicking first point" logic
- Preview line to cursor
- "Save Polygon" button

**New dependencies:**
- `@turf/circle`
- `@turf/union`
- `@turf/difference`

## Edge Cases

- **Erase everything** - Show empty state, next Add click starts fresh
- **Erase creates holes** - Turf handles this, result is polygon with holes
- **Erase splits into pieces** - Result becomes MultiPolygon (already supported)
- **Click outside polygon in erase mode** - No-op

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/polygon-draw.tsx` | Complete rewrite with brush logic |
| `src/stores/map-store.ts` | Simplify state (single polygon + history) |
| `package.json` | Add turf dependencies |

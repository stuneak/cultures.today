# Content Lightbox Design

## Overview

Add lightbox functionality to the content section so users can view images at full size (with zoom) and play videos in a modal overlay.

## Behavior

### Opening/Closing
- Click any content card to open lightbox with that item
- Close via: backdrop click, X button, or Escape key
- Prev/next arrows to navigate between content items

### Images
- Initial: scaled to fit viewport (max 90% width/height), centered
- Click image to toggle between fit-to-screen and full-size
- Touch devices: pinch-to-zoom supported
- When zoomed: scroll to pan, click or Escape to reset

### Videos (Uploaded)
- Native HTML5 video player with controls
- Sized to fit viewport
- No auto-play

### Videos (YouTube)
- Iframe embed with YouTube controls
- 16:9 aspect ratio, fit within viewport
- No auto-play
- Closing lightbox stops playback

## Implementation

### State
- `selectedIndex: number | null` in ContentSection
- `isZoomed: boolean` in ImageViewer

### Components
```
ContentSection
├── ContentCard (add onClick)
└── ContentLightbox
    ├── Modal (Mantine)
    ├── ImageViewer (zoom/pan)
    ├── VideoPlayer (HTML5)
    └── YouTubePlayer (iframe)
```

### File Changes
- `content-section.tsx` - All changes in this single file

### Dependencies
- None new (uses existing Mantine Modal)

"use client";

import { useState, useCallback } from "react";
import { WorldMap } from "@/components/map/world-map";
import { NationModal } from "@/components/nation/nation-modal";
import { NationSelectionPopup } from "@/components/map/nation-selection-popup";
import { NationSubmitWizard } from "@/components/nation/wizard";
import { MainPageControls } from "@/components/controls/main-page-controls";
import { AddNationButton } from "@/components/controls/add-nation-button";
import { BrushDraw } from "@/components/map/brush-draw";
import { useMapStore } from "@/stores/map-store";
import type { LngLat } from "maplibre-gl";

interface NationAtPoint {
  id: string;
  name: string;
  slug: string;
  flagUrl: string | null;
}

export default function HomePage() {
  const [selectedNationSlug, setSelectedNationSlug] = useState<string | null>(
    null
  );
  const [submitFormOpen, setSubmitFormOpen] = useState(false);
  const [overlappingNations, setOverlappingNations] = useState<
    NationAtPoint[] | null
  >(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawnBoundary, setDrawnBoundary] =
    useState<GeoJSON.Feature<GeoJSON.MultiPolygon> | null>(null);

  const { setIsDrawingMode, isDrawingMode, clearDrawing } = useMapStore();

  const handleNationClick = useCallback((slug: string) => {
    setSelectedNationSlug(slug);
    setOverlappingNations(null);
    setPopupPosition(null);
  }, []);

  const handleMultipleNations = useCallback(
    (nations: NationAtPoint[], _lngLat: LngLat) => {
      setOverlappingNations(nations);
      setPopupPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    },
    []
  );

  const handleClosePopup = useCallback(() => {
    setOverlappingNations(null);
    setPopupPosition(null);
  }, []);

  const handleStartDrawing = useCallback(() => {
    setIsDrawingMode(true);
  }, [setIsDrawingMode]);

  const handlePolygonComplete = useCallback(
    (multiPolygon: GeoJSON.Feature<GeoJSON.MultiPolygon>) => {
      setDrawnBoundary(multiPolygon);
      setSubmitFormOpen(true);
    },
    []
  );

  const handlePolygonCancel = useCallback(() => {
    setDrawnBoundary(null);
    // Note: clearDrawnPolygons is called inside PolygonDraw, so not needed here
  }, []);

  const handleSubmitFormClose = useCallback(() => {
    setSubmitFormOpen(false);
    setDrawnBoundary(null);
    clearDrawing();
  }, [clearDrawing]);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Full-screen globe map */}
      <WorldMap
        onNationClick={handleNationClick}
        onMultipleNationsAtPoint={handleMultipleNations}
      />

      {/* Right-side controls */}
      <MainPageControls />

      {/* Bottom center "+" button to add nation */}
      {!isDrawingMode && (
        <AddNationButton onStartDrawing={handleStartDrawing} />
      )}

      {/* Brush drawing mode UI */}
      <BrushDraw
        onComplete={handlePolygonComplete}
        onCancel={handlePolygonCancel}
      />

      {/* Overlapping nations selection popup */}
      {overlappingNations && popupPosition && (
        <NationSelectionPopup
          nations={overlappingNations}
          position={popupPosition}
          onSelect={handleNationClick}
          onClose={handleClosePopup}
        />
      )}

      {/* Nation details modal */}
      <NationModal
        slug={selectedNationSlug}
        onClose={() => setSelectedNationSlug(null)}
      />

      {/* Nation submission wizard with pre-filled boundary */}
      <NationSubmitWizard
        opened={submitFormOpen}
        onClose={handleSubmitFormClose}
        initialBoundary={drawnBoundary}
      />
    </div>
  );
}

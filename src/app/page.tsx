"use client";

import { useState, useCallback } from "react";
import { WorldMap } from "@/components/map/world-map";
import { CultureModal } from "@/components/culture/culture-modal";
import { CultureSelectionPopup } from "@/components/map/culture-selection-popup";
import { CultureSubmitWizard } from "@/components/culture/wizard";
import { MainPageControls } from "@/components/controls/main-page-controls";
import { AddCultureButton } from "@/components/controls/add-culture-button";
import { BrushDraw } from "@/components/map/brush-draw";
import { useMapStore } from "@/stores/map-store";
import type { LngLat } from "maplibre-gl";

interface CultureAtPoint {
  id: string;
  name: string;
  slug: string;
  flagUrl: string | null;
}

export default function HomePage() {
  const [selectedCultureSlug, setSelectedCultureSlug] = useState<string | null>(
    null
  );
  const [submitFormOpen, setSubmitFormOpen] = useState(false);
  const [overlappingCultures, setOverlappingCultures] = useState<
    CultureAtPoint[] | null
  >(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawnBoundary, setDrawnBoundary] =
    useState<GeoJSON.Feature<GeoJSON.MultiPolygon> | null>(null);

  const { setIsDrawingMode, isDrawingMode, clearDrawing } = useMapStore();

  const handleCultureClick = useCallback((slug: string) => {
    setSelectedCultureSlug(slug);
    setOverlappingCultures(null);
    setPopupPosition(null);
  }, []);

  const handleMultipleCultures = useCallback(
    (cultures: CultureAtPoint[], _lngLat: LngLat) => {
      setOverlappingCultures(cultures);
      setPopupPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    },
    []
  );

  const handleClosePopup = useCallback(() => {
    setOverlappingCultures(null);
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
        onCultureClick={handleCultureClick}
        onMultipleCulturesAtPoint={handleMultipleCultures}
      />

      {/* Right-side controls */}
      <MainPageControls />

      {/* Bottom center "+" button to add culture */}
      {!isDrawingMode && (
        <AddCultureButton onStartDrawing={handleStartDrawing} />
      )}

      {/* Brush drawing mode UI */}
      <BrushDraw
        onComplete={handlePolygonComplete}
        onCancel={handlePolygonCancel}
      />

      {/* Overlapping cultures selection popup */}
      {overlappingCultures && popupPosition && (
        <CultureSelectionPopup
          cultures={overlappingCultures}
          position={popupPosition}
          onSelect={handleCultureClick}
          onClose={handleClosePopup}
        />
      )}

      {/* Culture details modal */}
      <CultureModal
        slug={selectedCultureSlug}
        onClose={() => setSelectedCultureSlug(null)}
      />

      {/* Culture submission wizard with pre-filled boundary */}
      <CultureSubmitWizard
        opened={submitFormOpen}
        onClose={handleSubmitFormClose}
        initialBoundary={drawnBoundary}
      />
    </div>
  );
}

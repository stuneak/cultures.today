"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WorldMap } from "@/components/map/world-map";
import { CultureModal } from "@/components/culture/culture-modal";
import { CultureSelectionPopup } from "@/components/map/culture-selection-popup";
import { CultureSubmitWizard } from "@/components/culture/wizard";
import { MainPageControls } from "@/components/controls/main-page-controls";
import { AddCultureButton } from "@/components/controls/add-culture-button";
import { BrushDraw } from "@/components/map/brush-draw";
import { useMapStore } from "@/stores/map-store";

interface CultureAtPoint {
  id: string;
  name: string;
  slug: string;
  flagUrl: string | null;
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse initial values from URL
  const initialCulture = searchParams.get("culture");
  const initialZoom = searchParams.get("zoom")
    ? parseFloat(searchParams.get("zoom")!)
    : undefined;
  const initialLng = searchParams.get("lng")
    ? parseFloat(searchParams.get("lng")!)
    : undefined;
  const initialLat = searchParams.get("lat")
    ? parseFloat(searchParams.get("lat")!)
    : undefined;

  const [selectedCultureSlug, setSelectedCultureSlug] = useState<string | null>(
    initialCulture
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

  const { setIsDrawingMode, isDrawingMode, clearDrawing, mapInstance } =
    useMapStore();

  // Update URL when culture is selected
  const updateUrl = useCallback(
    (slug: string | null) => {
      if (!slug) {
        // Clear URL when modal is closed
        router.replace("/", { scroll: false });
        return;
      }

      const params = new URLSearchParams();
      params.set("culture", slug);

      // Add current map position
      if (mapInstance) {
        const center = mapInstance.getCenter();
        const zoom = mapInstance.getZoom();
        params.set("lng", center.lng.toFixed(4));
        params.set("lat", center.lat.toFixed(4));
        params.set("zoom", zoom.toFixed(2));
      }

      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [mapInstance, router]
  );

  const handleCultureClick = useCallback(
    (slug: string) => {
      setSelectedCultureSlug(slug);
      setOverlappingCultures(null);
      setPopupPosition(null);
      updateUrl(slug);
    },
    [updateUrl]
  );

  const handleMultipleCultures = useCallback(
    (cultures: CultureAtPoint[]) => {
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
        initialCenter={
          initialLng !== undefined && initialLat !== undefined
            ? [initialLng, initialLat]
            : undefined
        }
        initialZoom={initialZoom}
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
        onClose={() => {
          setSelectedCultureSlug(null);
          updateUrl(null);
        }}
        mapInstance={mapInstance}
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

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}

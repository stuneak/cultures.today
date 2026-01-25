"use client";

import { useState, useCallback } from "react";
import { ActionIcon, Tooltip, useMantineColorScheme } from "@mantine/core";
import {
  IconPlus,
  IconMinus,
  IconCurrentLocation,
  IconSun,
  IconMoon,
  IconInfoCircle,
} from "@tabler/icons-react";
import { WorldMap } from "@/components/map/world-map";
import { NationSelectionPopup } from "@/components/map/nation-selection-popup";
import { NationModal } from "@/components/nation/nation-modal";
import { AuthButton } from "@/components/auth/auth-button";
import { useMapStore } from "@/stores/map-store";
import type { LngLat } from "maplibre-gl";

interface NationAtPoint {
  id: string;
  name: string;
  slug: string;
  flagUrl: string | null;
}

export default function Home() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { zoomIn, zoomOut, locateMe } = useMapStore();

  // Modal state
  const [selectedNationSlug, setSelectedNationSlug] = useState<string | null>(null);

  // Selection popup state (for overlapping nations)
  const [selectionPopup, setSelectionPopup] = useState<{
    nations: NationAtPoint[];
    position: { x: number; y: number };
  } | null>(null);

  const handleNationClick = useCallback((slug: string) => {
    setSelectedNationSlug(slug);
  }, []);

  const handleMultipleNationsAtPoint = useCallback(
    (nations: NationAtPoint[], lngLat: LngLat) => {
      // Get screen coordinates from the map event
      // The popup will appear near the click location
      const mapContainer = document.querySelector(".maplibregl-map");
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect();
        // Approximate screen position based on viewport center
        setSelectionPopup({
          nations,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          },
        });
      }
    },
    []
  );

  const closeSelectionPopup = useCallback(() => {
    setSelectionPopup(null);
  }, []);

  const closeNationModal = useCallback(() => {
    setSelectedNationSlug(null);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen map */}
      <WorldMap
        onNationClick={handleNationClick}
        onMultipleNationsAtPoint={handleMultipleNationsAtPoint}
      />

      {/* Right sidebar controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        {/* Auth button */}
        <AuthButton />
      </div>

      {/* Map controls - bottom right */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-2">
        <Tooltip label="Zoom in" position="left">
          <ActionIcon
            variant="main-page-control"
            size="lg"
            onClick={zoomIn}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Zoom out" position="left">
          <ActionIcon
            variant="main-page-control"
            size="lg"
            onClick={zoomOut}
          >
            <IconMinus size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="My location" position="left">
          <ActionIcon
            variant="main-page-control"
            size="lg"
            onClick={locateMe}
          >
            <IconCurrentLocation size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Toggle theme" position="left">
          <ActionIcon
            variant="main-page-control"
            size="lg"
            onClick={() => toggleColorScheme()}
          >
            {colorScheme === "dark" ? (
              <IconSun size={18} />
            ) : (
              <IconMoon size={18} />
            )}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="About" position="left">
          <ActionIcon
            variant="main-page-control"
            size="lg"
          >
            <IconInfoCircle size={18} />
          </ActionIcon>
        </Tooltip>
      </div>

      {/* Nation selection popup (for overlapping regions) */}
      {selectionPopup && (
        <NationSelectionPopup
          nations={selectionPopup.nations}
          position={selectionPopup.position}
          onSelect={handleNationClick}
          onClose={closeSelectionPopup}
        />
      )}

      {/* Nation details modal */}
      <NationModal slug={selectedNationSlug} onClose={closeNationModal} />
    </div>
  );
}

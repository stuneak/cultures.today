"use client";

import { useEffect, useRef } from "react";
import {
  Stack,
  Text,
  Card,
  Group,
  Image,
  Badge,
  Button,
  Alert,
} from "@mantine/core";
import {
  IconEdit,
  IconLanguage,
  IconPhoto,
  IconMap,
} from "@tabler/icons-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMediaUrl } from "@/lib/media-url";
import type { WizardFormData } from "../types";

interface ReviewStepProps {
  data: WizardFormData;
}

export function ReviewStep({ data }: ReviewStepProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const boundary: GeoJSON.Feature<GeoJSON.MultiPolygon> | null =
    data.boundaryGeoJson ? JSON.parse(data.boundaryGeoJson) : null;
  const polygonCount = boundary?.geometry?.coordinates?.length ?? 0;

  useEffect(() => {
    if (!mapContainerRef.current || !boundary) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [0, 20],
      zoom: 2,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add the boundary source
      map.addSource("boundary", {
        type: "geojson",
        data: boundary,
      });

      // Add fill layer
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.3,
        },
      });

      // Add stroke layer
      map.addLayer({
        id: "boundary-stroke",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": "#2563eb",
          "line-width": 2,
        },
      });

      // Fit map to boundary
      const coords = boundary.geometry.coordinates.flat(2);
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);

      const bounds = new maplibregl.LngLatBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      );

      map.fitBounds(bounds, { padding: 40 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [boundary]);

  return (
    <Stack gap="md">
      <Alert variant="light" color="blue">
        Almost there! Take a moment to review your submission before sending 💌
      </Alert>

      {/* Territory */}
      <Card withBorder>
        <Group gap="xs" mb="sm">
          <IconMap size={16} />
          <Text fw={600}>Territory</Text>
          <Badge size="sm" variant="light" color="blue">
            {polygonCount} {polygonCount === 1 ? "polygon" : "polygons"}
          </Badge>
        </Group>
        <Card withBorder p={0} className="overflow-hidden" mb="xs">
          <div ref={mapContainerRef} style={{ height: 200, width: "100%" }} />
        </Card>
      </Card>

      {/* Basic Info */}
      <Card withBorder>
        <Stack gap="xs">
          <div>
            <Text size="xs" c="dimmed">
              What’s your nation called?
            </Text>
            <Text>{data.name}</Text>
          </div>
          {data.description && (
            <div>
              <Text size="xs" c="dimmed">
                What makes your nation special?
              </Text>
              <Text size="sm">{data.description}</Text>
            </div>
          )}
          {data.flagUrl && (
            <div>
              <Text size="xs" c="dimmed">
                Flag
              </Text>
              <Image
                src={getMediaUrl(data.flagUrl)}
                alt="Flag"
                w={60}
                h={40}
                fit="contain"
                radius="sm"
                className="border mt-1"
              />
            </div>
          )}
        </Stack>
      </Card>

      {/* Languages */}
      <Card withBorder>
        <Stack gap="md">
          {data.languages.map((lang) => (
            <div key={lang.id}>
              <Text size="sm" fw={500} mb="xs">
                {lang.name}
              </Text>
              <Stack gap="xs">
                {lang.phrases.map((phrase, idx) => (
                  <Card key={phrase.id} withBorder p="xs">
                    <Text size="xs" fw={500}>
                      {phrase.text}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {phrase.translation}
                    </Text>
                    {phrase.audioUrl && (
                      <audio
                        controls
                        style={{ height: 24, marginTop: 4, width: "100%" }}
                      >
                        <source
                          src={getMediaUrl(phrase.audioUrl)}
                          type="audio/webm"
                        />
                      </audio>
                    )}
                  </Card>
                ))}
              </Stack>
            </div>
          ))}
        </Stack>
      </Card>

      {/* Contents */}

      <Stack gap="md">
        {data.contents.map((content) => (
          <Card key={content.id} withBorder p="sm">
            <Group gap="xs" mb="xs">
              <Text size="sm" fw={500}>
                {content.title}
              </Text>
              <Badge size="xs" variant="outline">
                {content.contentType === "VIDEO_YOUTUBE"
                  ? "YouTube"
                  : content.contentUrl?.match(/\.(mp4|webm)$/i)
                    ? "Video"
                    : "Image"}
              </Badge>
            </Group>
            {content.contentType === "VIDEO_YOUTUBE" && content.contentUrl && (
              <div style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${content.contentUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1]}`}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded"
                />
              </div>
            )}
            {content.contentType === "UPLOAD" &&
              content.contentUrl &&
              (content.contentUrl.match(/\.(mp4|webm)$/i) ? (
                <video controls style={{ width: "100%", aspectRatio: "16/9" }}>
                  <source
                    src={getMediaUrl(content.contentUrl)}
                    type="video/mp4"
                  />
                </video>
              ) : (
                <Image
                  src={getMediaUrl(content.contentUrl)}
                  alt={content.title}
                  w="100%"
                  h="auto"
                  mah={300}
                  fit="contain"
                  radius="sm"
                />
              ))}
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

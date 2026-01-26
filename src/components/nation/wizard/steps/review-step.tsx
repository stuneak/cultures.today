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
} from "@mantine/core";
import { IconEdit, IconLanguage, IconPhoto, IconMap } from "@tabler/icons-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMediaUrl } from "@/lib/media-url";
import type { WizardFormData } from "../types";

interface ReviewStepProps {
  data: WizardFormData;
  onEditStep: (step: number) => void;
}

export function ReviewStep({ data, onEditStep }: ReviewStepProps) {
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
        [Math.max(...lngs), Math.max(...lats)]
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
      <Text size="sm" c="dimmed">
        Review your submission before submitting.
      </Text>

      {/* Basic Info */}
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Basic Info</Text>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEditStep(0)}
          >
            Edit
          </Button>
        </Group>
        <Stack gap="xs">
          <div>
            <Text size="xs" c="dimmed">
              Name
            </Text>
            <Text>{data.name}</Text>
          </div>
          {data.description && (
            <div>
              <Text size="xs" c="dimmed">
                Description
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

      {/* Territory */}
      <Card withBorder>
        <Group gap="xs" mb="sm">
          <IconMap size={16} />
          <Text fw={600}>Territory</Text>
        </Group>
        <Card withBorder p={0} className="overflow-hidden" mb="xs">
          <div ref={mapContainerRef} style={{ height: 200, width: "100%" }} />
        </Card>
        <Text size="sm" c="dimmed">
          {polygonCount} polygon{polygonCount !== 1 ? "s" : ""} defined
        </Text>
      </Card>

      {/* Languages */}
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconLanguage size={16} />
            <Text fw={600}>Languages ({data.languages.length})</Text>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEditStep(1)}
          >
            Edit
          </Button>
        </Group>
        <Stack gap="md">
          {data.languages.map((lang) => (
            <div key={lang.id}>
              <Text size="sm" fw={500} mb="xs">
                {lang.name}
              </Text>
              <Stack gap="xs" pl="sm">
                {lang.phrases.map((phrase, idx) => (
                  <Card key={phrase.id} withBorder p="xs">
                    <Text size="xs" fw={500}>
                      {phrase.text}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {phrase.translation}
                    </Text>
                    {phrase.audioUrl && (
                      <audio controls style={{ height: 24, marginTop: 4 }}>
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
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconPhoto size={16} />
            <Text fw={600}>Contents ({data.contents.length})</Text>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEditStep(2)}
          >
            Edit
          </Button>
        </Group>
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
                <iframe
                  src={`https://www.youtube.com/embed/${content.contentUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1]}`}
                  width={200}
                  height={120}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded"
                />
              )}
              {content.contentType === "UPLOAD" && content.contentUrl && (
                content.contentUrl.match(/\.(mp4|webm)$/i) ? (
                  <video controls style={{ width: 200, height: 120 }}>
                    <source src={getMediaUrl(content.contentUrl)} type="video/mp4" />
                  </video>
                ) : (
                  <Image
                    src={getMediaUrl(content.contentUrl)}
                    alt={content.title}
                    w={200}
                    h={120}
                    fit="cover"
                    radius="sm"
                  />
                )
              )}
            </Card>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

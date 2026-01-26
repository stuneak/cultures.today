"use client";

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
import { getMediaUrl } from "@/lib/media-url";
import type { WizardFormData } from "../types";

interface ReviewStepProps {
  data: WizardFormData;
  onEditStep: (step: number) => void;
}

export function ReviewStep({ data, onEditStep }: ReviewStepProps) {
  const boundary: GeoJSON.Feature<GeoJSON.MultiPolygon> | null =
    data.boundaryGeoJson ? JSON.parse(data.boundaryGeoJson) : null;
  const polygonCount = boundary?.geometry?.coordinates?.length ?? 0;

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
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconMap size={16} />
            <Text fw={600}>Territory</Text>
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
            onClick={() => onEditStep(2)}
          >
            Edit
          </Button>
        </Group>
        <Stack gap="xs">
          {data.languages.map((lang) => (
            <Group key={lang.id} gap="xs">
              <Text size="sm" fw={500}>
                {lang.name}
              </Text>
              <Badge size="xs" variant="light">
                {lang.phrases.length} phrase
                {lang.phrases.length !== 1 ? "s" : ""}
              </Badge>
            </Group>
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
            onClick={() => onEditStep(3)}
          >
            Edit
          </Button>
        </Group>
        <Stack gap="xs">
          {data.contents.map((content) => (
            <Group key={content.id} gap="xs">
              <Text size="sm">{content.title}</Text>
              <Badge size="xs" variant="light">
                {content.category}
              </Badge>
              <Badge size="xs" variant="outline">
                {content.contentType === "VIDEO_YOUTUBE"
                  ? "YouTube"
                  : content.contentType === "VIDEO_UPLOAD"
                    ? "Video"
                    : "Image"}
              </Badge>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

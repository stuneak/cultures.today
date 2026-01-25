"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Text,
  Alert,
  Badge,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconCheck, IconMapPin } from "@tabler/icons-react";

interface NationSubmitFormProps {
  opened: boolean;
  onClose: () => void;
  initialBoundary?: GeoJSON.Feature<GeoJSON.Polygon> | null;
}

export function NationSubmitForm({
  opened,
  onClose,
  initialBoundary,
}: NationSubmitFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      boundaryGeoJson: "",
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Name must be at least 2 characters" : null,
    },
  });

  // Pre-fill boundary when polygon is drawn on map
  useEffect(() => {
    if (initialBoundary) {
      // Convert Polygon to MultiPolygon for consistency with schema
      const multiPolygonFeature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [initialBoundary.geometry.coordinates],
        },
      };
      form.setFieldValue(
        "boundaryGeoJson",
        JSON.stringify(multiPolygonFeature, null, 2)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBoundary]);

  // Reset form when modal closes
  useEffect(() => {
    if (!opened) {
      form.reset();
      setSuccess(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/nations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          boundaryGeoJson: values.boundaryGeoJson || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit nation");
      }

      setSuccess(true);
      form.reset();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const hasBoundary = !!form.values.boundaryGeoJson;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Submit a New Nation"
      size="lg"
    >
      {success ? (
        <Alert icon={<IconCheck size={16} />} color="green" title="Success!">
          Your nation has been submitted and is pending review by our
          moderators.
        </Alert>
      ) : (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                title="Error"
              >
                {error}
              </Alert>
            )}

            <Text size="sm" c="dimmed">
              Anyone can submit a nation. Submissions will be reviewed by
              moderators before appearing on the map.
            </Text>

            {/* Show boundary status */}
            {hasBoundary && (
              <Group gap="xs">
                <Badge
                  leftSection={<IconMapPin size={12} />}
                  color="green"
                  variant="light"
                >
                  Boundary drawn on map
                </Badge>
              </Group>
            )}

            <TextInput
              label="Nation Name"
              placeholder="Enter the nation's name"
              required
              {...form.getInputProps("name")}
            />

            <Textarea
              label="Description"
              placeholder="Describe this nation's history and culture"
              rows={4}
              {...form.getInputProps("description")}
            />

            <Textarea
              label="Boundary GeoJSON"
              placeholder={
                hasBoundary
                  ? "Boundary captured from map drawing"
                  : "Paste GeoJSON with MultiPolygon geometry"
              }
              rows={4}
              {...form.getInputProps("boundaryGeoJson")}
              description={
                hasBoundary
                  ? "Automatically filled from your map drawing"
                  : "Advanced: Paste valid GeoJSON with MultiPolygon geometry for map display"
              }
              disabled={!!initialBoundary}
            />

            <Button type="submit" loading={submitting} fullWidth>
              Submit Nation
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  );
}

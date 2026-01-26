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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

interface NationSubmitFormProps {
  opened: boolean;
  onClose: () => void;
  initialBoundary?: GeoJSON.Feature<GeoJSON.MultiPolygon> | null;
}

export function NationSubmitForm({
  opened,
  onClose,
  initialBoundary,
}: NationSubmitFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<string>("");

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Name must be at least 2 characters" : null,
    },
  });

  // Store boundary when polygon is drawn on map
  useEffect(() => {
    if (initialBoundary) {
      setBoundaryGeoJson(JSON.stringify(initialBoundary));
    }
  }, [initialBoundary]);

  const polygonCount = initialBoundary?.geometry?.coordinates?.length ?? 0;

  // Reset form when modal closes
  useEffect(() => {
    if (!opened) {
      form.reset();
      setSuccess(false);
      setError(null);
      setBoundaryGeoJson("");
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
          boundaryGeoJson: boundaryGeoJson || undefined,
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Submit a New Nation"
      size="md"
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
              {polygonCount > 0
                ? `Your ${polygonCount} drawn polygon${polygonCount !== 1 ? "s have" : " has"} been saved. Fill in the details below.`
                : "Fill in the details below to complete your submission."}
            </Text>

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

            <Button type="submit" loading={submitting} fullWidth>
              Submit Nation
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Skeleton,
  Alert,
  Divider,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";

interface NationDetails {
  id: string;
  name: string;
  slug: string;
  state: string;
  description: string | null;
  boundaryGeoJson: string | null;
  submittedBy: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface NationReviewModalProps {
  nationId: string | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function NationReviewModal({
  nationId,
  onClose,
  onApprove,
  onReject,
}: NationReviewModalProps) {
  const [nation, setNation] = useState<NationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nationId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/admin/nations/${nationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch nation");
        return res.json();
      })
      .then((data) => setNation(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [nationId]);

  return (
    <Modal
      opened={!!nationId}
      onClose={onClose}
      title="Review Nation Submission"
      size="lg"
    >
      {loading && (
        <Stack gap="md">
          <Skeleton height={30} />
          <Skeleton height={100} />
          <Skeleton height={50} />
        </Stack>
      )}

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {nation && !loading && (
        <Stack gap="md">
          <div>
            <Text size="xl" fw={700}>
              {nation.name}
            </Text>
            <Group gap="xs" mt="xs">
              <Badge color={nation.state === "pending" ? "yellow" : "green"}>
                {nation.state}
              </Badge>
            </Group>
          </div>

          {nation.description && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Description
              </Text>
              <Text size="sm" c="dimmed">
                {nation.description}
              </Text>
            </div>
          )}

          {nation.boundaryGeoJson && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Has Boundary Data
              </Text>
              <Badge color="blue">GeoJSON provided</Badge>
            </div>
          )}

          {nation.submittedBy && (
            <div>
              <Text size="sm" fw={500}>
                Submitted By
              </Text>
              <Text size="sm" c="dimmed">
                {nation.submittedBy.firstName} {nation.submittedBy.lastName} (
                {nation.submittedBy.email})
              </Text>
            </div>
          )}

          <Divider />

          <Group justify="flex-end">
            <Button
              color="red"
              variant="light"
              leftSection={<IconX size={16} />}
              onClick={() => {
                onReject(nation.id);
                onClose();
              }}
            >
              Reject
            </Button>
            <Button
              color="green"
              leftSection={<IconCheck size={16} />}
              onClick={() => {
                onApprove(nation.id);
                onClose();
              }}
            >
              Approve
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

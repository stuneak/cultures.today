"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Group,
  Text,
  Skeleton,
  Alert,
} from "@mantine/core";
import { IconEye, IconCheck, IconX } from "@tabler/icons-react";

interface Nation {
  id: string;
  name: string;
  slug: string;
  state: string;
  description: string | null;
  createdAt: string;
  submittedBy: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface PendingNationsTableProps {
  onReview: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PendingNationsTable({
  onReview,
  onApprove,
  onReject,
}: PendingNationsTableProps) {
  const [nations, setNations] = useState<Nation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNations = async () => {
    try {
      const response = await fetch("/api/admin/nations?state=pending");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setNations(data.nations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load nations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNations();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={50} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  }

  if (nations.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No pending nations to review.
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Submitted By</Table.Th>
          <Table.Th>Date</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {nations.map((nation) => (
          <Table.Tr key={nation.id}>
            <Table.Td>
              <Text fw={500}>{nation.name}</Text>
            </Table.Td>
            <Table.Td>
              {nation.submittedBy ? (
                <Text size="sm">
                  {nation.submittedBy.firstName} {nation.submittedBy.lastName}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Anonymous
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {new Date(nation.createdAt).toLocaleDateString()}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconEye size={14} />}
                  onClick={() => onReview(nation.id)}
                >
                  Review
                </Button>
                <Button
                  size="xs"
                  color="green"
                  variant="light"
                  leftSection={<IconCheck size={14} />}
                  onClick={() => onApprove(nation.id)}
                >
                  Approve
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<IconX size={14} />}
                  onClick={() => onReject(nation.id)}
                >
                  Reject
                </Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

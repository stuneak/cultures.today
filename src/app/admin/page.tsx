"use client";

import { useState, useCallback } from "react";
import { Paper, Title, Tabs } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconClock, IconCheck } from "@tabler/icons-react";
import { PendingNationsTable } from "@/components/admin/pending-nations-table";
import { NationReviewModal } from "@/components/admin/nation-review-modal";

export default function AdminPage() {
  const [reviewNationId, setReviewNationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleApprove = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/nations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "approved" }),
      });

      if (!response.ok) throw new Error("Failed to approve");

      notifications.show({
        title: "Nation Approved",
        message: "The nation is now visible on the public map.",
        color: "green",
      });

      setRefreshKey((k) => k + 1);
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to approve nation",
        color: "red",
      });
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/nations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to reject");

      notifications.show({
        title: "Nation Rejected",
        message: "The submission has been removed.",
        color: "orange",
      });

      setRefreshKey((k) => k + 1);
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to reject nation",
        color: "red",
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <Title order={3}>Nation Moderation</Title>

      <Paper withBorder p="md">
        <Tabs defaultValue="pending">
          <Tabs.List>
            <Tabs.Tab value="pending" leftSection={<IconClock size={16} />}>
              Pending Review
            </Tabs.Tab>
            <Tabs.Tab value="approved" leftSection={<IconCheck size={16} />}>
              Approved
            </Tabs.Tab>
          </Tabs.List>

          <div className="mt-4">
            <Tabs.Panel value="pending">
              <PendingNationsTable
                key={refreshKey}
                onReview={setReviewNationId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </Tabs.Panel>

            <Tabs.Panel value="approved">
              <div className="py-8 text-center text-gray-500">
                Approved nations management coming soon.
              </div>
            </Tabs.Panel>
          </div>
        </Tabs>
      </Paper>

      <NationReviewModal
        nationId={reviewNationId}
        onClose={() => setReviewNationId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Box, Loader, Center, Text } from "@mantine/core";
import { CultureTabs } from "./CultureTabs";
import { CultureList } from "./CultureList";
import { CultureEditor } from "./CultureEditor";

export interface CultureListItem {
  id: string;
  name: string;
  slug: string;
  state: "pending" | "approved";
  createdAt: string;
  submittedBy: { id: string; email: string } | null;
}

export function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [cultures, setCultures] = useState<CultureListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCultures = useCallback(async (state: "pending" | "approved") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cultures?state=${state}`);
      const data = await res.json();
      setCultures(data.cultures || []);
    } catch (err) {
      console.error("Failed to fetch cultures:", err);
      setCultures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check admin status
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      // Verify admin status by trying to fetch admin endpoint
      fetch("/api/admin/cultures?state=pending")
        .then((res) => {
          if (res.status === 403 || res.status === 401) {
            setIsAdmin(false);
            router.push("/");
          } else if (res.ok) {
            setIsAdmin(true);
          }
        })
        .catch(() => {
          setIsAdmin(false);
          router.push("/");
        });
    }
  }, [status, router]);

  // Fetch cultures when tab changes or admin status confirmed
  useEffect(() => {
    if (!isAdmin) return;
    fetchCultures(activeTab);
  }, [activeTab, isAdmin, fetchCultures]);

  const handleTabChange = (tab: "pending" | "approved") => {
    setActiveTab(tab);
    setSelectedSlug(null);
  };

  const handleCultureUpdated = () => {
    fetchCultures(activeTab);
  };

  const handleCultureDeleted = () => {
    setSelectedSlug(null);
    handleCultureUpdated();
  };

  // Loading state
  if (status === "loading" || isAdmin === null) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Not admin (should redirect, but show message just in case)
  if (!isAdmin) {
    return (
      <Center h="100vh">
        <Text c="dimmed">Redirecting...</Text>
      </Center>
    );
  }

  return (
    <Box
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Tabs */}
      <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <CultureTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </Box>

      {/* Main content */}
      <Box
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* Left panel - Culture list */}
        <Box
          style={{
            width: 300,
            borderRight: "1px solid var(--mantine-color-default-border)",
            overflow: "auto",
          }}
        >
          <CultureList
            cultures={cultures}
            loading={loading}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
          />
        </Box>

        {/* Right panel - Editor */}
        <Box style={{ flex: 1, overflow: "auto" }}>
          {selectedSlug ? (
            <CultureEditor
              slug={selectedSlug}
              onUpdated={handleCultureUpdated}
              onDeleted={handleCultureDeleted}
            />
          ) : (
            <Center h="100%" c="dimmed">
              <Text>Select a culture to view details</Text>
            </Center>
          )}
        </Box>
      </Box>
    </Box>
  );
}

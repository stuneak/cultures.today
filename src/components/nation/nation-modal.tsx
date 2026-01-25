"use client";

import { useEffect, useState } from "react";
import { Modal, Tabs, Text, Skeleton, Group, Title } from "@mantine/core";
import {
  IconLanguage,
  IconPhoto,
} from "@tabler/icons-react";
import { LanguagesSection } from "./sections/languages-section";
import { ContentSection } from "./sections/content-section";
import { getMediaUrl } from "@/lib/media-url";
import Image from "next/image";

interface NationModalProps {
  slug: string | null;
  onClose: () => void;
}

interface NationDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  flagUrl: string | null;
  languages: any[];
  contents: any[];
}

export function NationModal({ slug, onClose }: NationModalProps) {
  const [nation, setNation] = useState<NationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    fetch(`/api/nations/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nation not found");
        return res.json();
      })
      .then((data) => setNation(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <Modal
      opened={!!slug}
      onClose={onClose}
      size="xl"
      title={
        loading ? (
          <Skeleton height={24} width={200} />
        ) : nation ? (
          <Group gap="sm">
            {nation.flagUrl && (
              <div className="relative w-8 h-6">
                <Image
                  src={getMediaUrl(nation.flagUrl)}
                  alt={`${nation.name} flag`}
                  fill
                  className="object-cover rounded"
                />
              </div>
            )}
            <Title order={3}>{nation.name}</Title>
          </Group>
        ) : null
      }
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      {loading && (
        <div className="space-y-4">
          <Skeleton height={100} />
          <Skeleton height={200} />
        </div>
      )}

      {error && (
        <Text c="red" ta="center" py="xl">
          {error}
        </Text>
      )}

      {nation && !loading && (
        <div className="space-y-4">
          {/* Header info */}
          <div>
            {nation.description && (
              <Text size="sm" c="dimmed" mb="md">
                {nation.description}
              </Text>
            )}
          </div>

          {/* Tabbed content */}
          <Tabs defaultValue="languages">
            <Tabs.List>
              <Tabs.Tab value="languages" leftSection={<IconLanguage size={16} />}>
                Languages ({nation.languages.length})
              </Tabs.Tab>
              <Tabs.Tab value="content" leftSection={<IconPhoto size={16} />}>
                Content ({nation.contents.length})
              </Tabs.Tab>
            </Tabs.List>

            <div className="pt-4">
              <Tabs.Panel value="languages">
                <LanguagesSection languages={nation.languages} />
              </Tabs.Panel>
              <Tabs.Panel value="content">
                <ContentSection contents={nation.contents} />
              </Tabs.Panel>
            </div>
          </Tabs>
        </div>
      )}
    </Modal>
  );
}

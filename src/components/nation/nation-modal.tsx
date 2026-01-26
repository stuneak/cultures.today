"use client";

import { useEffect, useState } from "react";
import { Modal, Text, Skeleton, Group, Title, Divider } from "@mantine/core";
import { IconLanguage, IconPhoto } from "@tabler/icons-react";
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
                  unoptimized={getMediaUrl(nation.flagUrl).includes("localhost")}
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
        <div className="space-y-6">
          {/* Description */}
          {nation.description && (
            <Text size="sm" c="dimmed">
              {nation.description}
            </Text>
          )}

          {/* Languages Section */}
          {nation.languages.length > 0 && (
            <div>
              <Group gap="xs" mb="sm">
                <IconLanguage size={18} />
                <Title order={5}>Languages ({nation.languages.length})</Title>
              </Group>
              <LanguagesSection languages={nation.languages} />
            </div>
          )}

          {/* Divider between sections */}
          {nation.languages.length > 0 && nation.contents.length > 0 && (
            <Divider />
          )}

          {/* Content Section */}
          {nation.contents.length > 0 && (
            <div>
              <Group gap="xs" mb="sm">
                <IconPhoto size={18} />
                <Title order={5}>Content ({nation.contents.length})</Title>
              </Group>
              <ContentSection contents={nation.contents} />
            </div>
          )}

          {/* Empty state */}
          {nation.languages.length === 0 && nation.contents.length === 0 && (
            <Text c="dimmed" ta="center" py="md">
              No additional information available for this nation yet.
            </Text>
          )}
        </div>
      )}
    </Modal>
  );
}

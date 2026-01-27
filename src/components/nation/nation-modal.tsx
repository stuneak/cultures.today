"use client";

import { useEffect, useState } from "react";
import { Modal, Text, Skeleton, Group, Title, Divider } from "@mantine/core";
import { LanguagesSection } from "./sections/languages-section";
import { ContentSection } from "./sections/content-section";
import { getMediaUrl } from "@/lib/media-url";
import Image from "next/image";

interface NationModalProps {
  slug: string | null;
  onClose: () => void;
}

interface Phrase {
  id: string;
  text: string;
  translation: string;
  audioUrl: string;
}

interface Language {
  id: string;
  name: string;
  phrases: Phrase[];
}

interface Content {
  id: string;
  title: string;
  contentType: "UPLOAD" | "VIDEO_YOUTUBE";
  contentUrl: string | null;
}

interface NationDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  flagUrl: string | null;
  languages: Language[];
  contents: Content[];
}

export function NationModal({ slug, onClose }: NationModalProps) {
  const [nation, setNation] = useState<NationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let ignore = false;

    async function fetchNation() {
      try {
        const res = await fetch(`/api/nations/${slug}`);
        if (!res.ok) throw new Error("Nation not found");
        const data = await res.json();
        if (!ignore) {
          setNation(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    setNation(null);
    setError(null);
    setLoading(true);
    fetchNation();

    return () => {
      ignore = true;
    };
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
                  className="object-contain rounded"
                  unoptimized={getMediaUrl(nation.flagUrl).includes(
                    "localhost",
                  )}
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
          {/* Description */}
          {nation.description && (
            <div>
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                What makes this nation special?
              </Text>
              <Text size="sm" lh={1.6}>
                {nation.description}
              </Text>
            </div>
          )}

          {/* Divider after description if languages or content exist */}
          {nation.description &&
            (nation.languages.length > 0 || nation.contents.length > 0) && (
              <Divider />
            )}

          {/* Languages Section */}
          {nation.languages.length > 0 && (
            <div>
              <LanguagesSection languages={nation.languages} />
            </div>
          )}

          {/* Divider after languages if content exists */}
          {nation.languages.length > 0 && nation.contents.length > 0 && (
            <Divider />
          )}

          {/* Content Section */}
          {nation.contents.length > 0 && (
            <div>
              <ContentSection contents={nation.contents} />
            </div>
          )}

          {/* Empty state */}
          {!nation.description &&
            nation.languages.length === 0 &&
            nation.contents.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                No additional information available for this nation yet.
              </Text>
            )}
        </div>
      )}
    </Modal>
  );
}

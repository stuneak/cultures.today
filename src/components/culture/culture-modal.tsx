"use client";

import { useEffect, useState } from "react";
import { Modal, Text, Skeleton, Group, Title, Divider } from "@mantine/core";
import { LanguagesSection } from "./sections/languages-section";
import { ContentSection } from "./sections/content-section";
import { getMediaUrl } from "@/lib/media-url";
import Image from "next/image";

interface CultureModalProps {
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

interface CultureDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  flagUrl: string | null;
  languages: Language[];
  contents: Content[];
}

export function CultureModal({ slug, onClose }: CultureModalProps) {
  const [culture, setCulture] = useState<CultureDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let ignore = false;

    async function fetchCulture() {
      try {
        const res = await fetch(`/api/cultures/${slug}`);
        if (!res.ok) throw new Error("Culture not found");
        const data = await res.json();
        if (!ignore) {
          setCulture(data);
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

    setCulture(null);
    setError(null);
    setLoading(true);
    fetchCulture();

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
        ) : culture ? (
          <Group gap="sm">
            {culture.flagUrl && (
              <div className="relative w-8 h-6">
                <Image
                  src={getMediaUrl(culture.flagUrl)}
                  alt={`${culture.name} flag`}
                  fill
                  className="object-contain rounded"
                  unoptimized={getMediaUrl(culture.flagUrl).includes(
                    "localhost",
                  )}
                />
              </div>
            )}
            <Title order={3}>{culture.name}</Title>
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

      {culture && !loading && (
        <div className="space-y-4">
          {/* Description */}
          {culture.description && (
            <div className="break-words">
              <Text
                size="xs"
                fw={600}
                c="dimmed"
                mb={4}
                style={{ wordBreak: "break-word" }}
              >
                What makes this culture special?
              </Text>
              <Text size="sm" lh={1.6}>
                {culture.description}
              </Text>
            </div>
          )}

          {/* Divider after description if languages or content exist */}
          {culture.description &&
            (culture.languages.length > 0 || culture.contents.length > 0) && (
              <Divider />
            )}

          {/* Languages Section */}
          {culture.languages.length > 0 && (
            <div>
              <LanguagesSection languages={culture.languages} />
            </div>
          )}

          {/* Divider after languages if content exists */}
          {culture.languages.length > 0 && culture.contents.length > 0 && (
            <Divider />
          )}

          {/* Content Section */}
          {culture.contents.length > 0 && (
            <div>
              <ContentSection contents={culture.contents} />
            </div>
          )}

          {/* Empty state */}
          {!culture.description &&
            culture.languages.length === 0 &&
            culture.contents.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                No additional information available for this culture yet.
              </Text>
            )}
        </div>
      )}
    </Modal>
  );
}

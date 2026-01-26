"use client";

import { Card, Text, Group } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { IconToolsKitchen2, IconMusic, IconPhoto } from "@tabler/icons-react";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media-url";

interface Content {
  id: string;
  title: string;
  contentType: "IMAGE_UPLOAD" | "VIDEO_UPLOAD" | "VIDEO_YOUTUBE";
  contentUrl: string | null;
  category: "FOOD" | "MUSIC" | "OTHER";
}

interface ContentSectionProps {
  contents: Content[];
}

function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/
  )?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function ContentCard({ item }: { item: Content }) {
  const isVideo = item.contentType === "VIDEO_UPLOAD";
  const isYouTube = item.contentType === "VIDEO_YOUTUBE";
  const isImage = item.contentType === "IMAGE_UPLOAD";
  const youtubeEmbed = isYouTube && item.contentUrl ? getYouTubeEmbedUrl(item.contentUrl) : null;

  return (
    <Card withBorder p="xs">
      <div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
        {isYouTube && youtubeEmbed && (
          <iframe
            src={youtubeEmbed}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        {isVideo && item.contentUrl && (
          <video controls className="absolute inset-0 w-full h-full object-contain">
            <source src={getMediaUrl(item.contentUrl)} type="video/mp4" />
          </video>
        )}
        {isImage && item.contentUrl && (
          <Image
            src={getMediaUrl(item.contentUrl)}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized={getMediaUrl(item.contentUrl).includes("localhost")}
          />
        )}
      </div>
      <Text size="sm" fw={500} mt="xs" lineClamp={1}>
        {item.title}
      </Text>
    </Card>
  );
}

export function ContentSection({ contents }: ContentSectionProps) {
  if (contents.length === 0) {
    return (
      <Card withBorder>
        <Text c="dimmed">No content available.</Text>
      </Card>
    );
  }

  const foodContent = contents.filter((c) => c.category === "FOOD");
  const musicContent = contents.filter((c) => c.category === "MUSIC");
  const otherContent = contents.filter((c) => c.category === "OTHER");

  const categories = [
    { label: "All", icon: null, items: contents },
    { label: "Food", icon: <IconToolsKitchen2 size={14} />, items: foodContent },
    { label: "Music", icon: <IconMusic size={14} />, items: musicContent },
    { label: "Other", icon: <IconPhoto size={14} />, items: otherContent },
  ].filter((cat) => cat.items.length > 0);

  return (
    <Carousel
      slideSize="100%"
      slideGap="md"
      emblaOptions={{ loop: categories.length > 1 }}
      withIndicators
      withControls={categories.length > 1}
    >
      {categories.map((category) => (
        <Carousel.Slide key={category.label}>
          <div>
            <Group gap="xs" mb="md">
              {category.icon}
              <Text fw={500}>
                {category.label} ({category.items.length})
              </Text>
            </Group>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </Carousel.Slide>
      ))}
    </Carousel>
  );
}

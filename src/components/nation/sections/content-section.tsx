"use client";

import { Card, Text } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media-url";

interface Content {
  id: string;
  title: string;
  contentType: "UPLOAD" | "VIDEO_YOUTUBE";
  contentUrl: string | null;
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
  const isYouTube = item.contentType === "VIDEO_YOUTUBE";
  const isVideo = item.contentType === "UPLOAD" && item.contentUrl?.match(/\.(mp4|webm)$/i);
  const isImage = item.contentType === "UPLOAD" && !isVideo;
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

  return (
    <Carousel
      slideSize="100%"
      slideGap="md"
      emblaOptions={{ loop: contents.length > 1 }}
      withIndicators
      withControls={contents.length > 1}
    >
      {contents.map((item) => (
        <Carousel.Slide key={item.id}>
          <ContentCard item={item} />
        </Carousel.Slide>
      ))}
    </Carousel>
  );
}

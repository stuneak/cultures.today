"use client";

import Image from "next/image";
import { Card, Text, Badge, Tabs } from "@mantine/core";
import { IconToolsKitchen2, IconMusic, IconPhoto } from "@tabler/icons-react";
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

function getYouTubeEmbedUrl(url: string): string {
  const videoId = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/
  )?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function ContentCard({ item }: { item: Content }) {
  const isYouTube = item.contentType === "VIDEO_YOUTUBE";
  const isVideo = item.contentType === "VIDEO_UPLOAD";
  const isImage = item.contentType === "IMAGE_UPLOAD";

  return (
    <Card withBorder p={0} className="overflow-hidden">
      <div className="relative aspect-video bg-gray-100">
        {isYouTube && item.contentUrl && (
          <iframe
            src={getYouTubeEmbedUrl(item.contentUrl)}
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
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Text fw={500}>{item.title}</Text>
          <Badge size="xs" variant="light">
            {item.contentType === "VIDEO_YOUTUBE" ? "YouTube" :
             item.contentType === "VIDEO_UPLOAD" ? "Video" : "Image"}
          </Badge>
        </div>
      </div>
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

  return (
    <Tabs defaultValue="all">
      <Tabs.List>
        <Tabs.Tab value="all">All ({contents.length})</Tabs.Tab>
        {foodContent.length > 0 && (
          <Tabs.Tab value="food" leftSection={<IconToolsKitchen2 size={14} />}>
            Food ({foodContent.length})
          </Tabs.Tab>
        )}
        {musicContent.length > 0 && (
          <Tabs.Tab value="music" leftSection={<IconMusic size={14} />}>
            Music ({musicContent.length})
          </Tabs.Tab>
        )}
        {otherContent.length > 0 && (
          <Tabs.Tab value="other" leftSection={<IconPhoto size={14} />}>
            Other ({otherContent.length})
          </Tabs.Tab>
        )}
      </Tabs.List>

      <Tabs.Panel value="all" pt="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contents.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="food" pt="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {foodContent.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="music" pt="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {musicContent.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="other" pt="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherContent.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}

"use client";

import { Text, Modal, ActionIcon } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media-url";
import { useState, useEffect, useCallback } from "react";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";

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
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
  )?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div
      className={`flex items-center justify-center w-full h-full ${
        isZoomed ? "overflow-auto" : "overflow-hidden"
      }`}
      onClick={() => setIsZoomed(!isZoomed)}
    >
      <img
        src={src}
        alt={alt}
        className={`${
          isZoomed
            ? "max-w-none cursor-zoom-out"
            : "max-w-[90vw] max-h-[90vh] object-contain cursor-zoom-in"
        }`}
        style={isZoomed ? { width: "auto", height: "auto" } : undefined}
      />
    </div>
  );
}

function ContentLightbox({
  contents,
  selectedIndex,
  onClose,
  onNavigate,
}: {
  contents: Content[];
  selectedIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const item = selectedIndex !== null ? contents[selectedIndex] : null;

  const handlePrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      onNavigate(selectedIndex - 1);
    }
  }, [selectedIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < contents.length - 1) {
      onNavigate(selectedIndex + 1);
    }
  }, [selectedIndex, contents.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  if (!item || !item.contentUrl) return null;

  const isYouTube = item.contentType === "VIDEO_YOUTUBE";
  const isVideo =
    item.contentType === "UPLOAD" && item.contentUrl.match(/\.(mp4|webm)$/i);
  const isImage = item.contentType === "UPLOAD" && !isVideo;
  const youtubeEmbed = isYouTube ? getYouTubeEmbedUrl(item.contentUrl) : null;

  return (
    <Modal
      opened={selectedIndex !== null}
      onClose={onClose}
      size="100%"
      fullScreen
      withCloseButton={false}
      styles={{
        body: {
          padding: 0,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        content: {
          background: "rgba(0, 0, 0, 0.95)",
          border: "none",
          boxShadow: "none",
        },
      }}
      data-mantine-color-scheme="dark"
    >
      <ActionIcon
        variant="lightbox-control"
        onClick={onClose}
        size="xl"
        className="absolute top-4 right-4 z-10"
      >
        <IconX size={24} />
      </ActionIcon>

      {contents.length > 1 && selectedIndex !== null && selectedIndex > 0 && (
        <ActionIcon
          variant="lightbox-control"
          size="xl"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
          onClick={handlePrev}
        >
          <IconChevronLeft size={32} />
        </ActionIcon>
      )}

      {contents.length > 1 &&
        selectedIndex !== null &&
        selectedIndex < contents.length - 1 && (
          <ActionIcon
            variant="lightbox-control"
            size="xl"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            onClick={handleNext}
          >
            <IconChevronRight size={32} />
          </ActionIcon>
        )}

      <div className="flex items-center justify-center w-full h-full p-8">
        {isImage && (
          <ImageViewer src={getMediaUrl(item.contentUrl)} alt={item.title} />
        )}

        {isVideo && (
          <video controls className="max-w-[90vw] max-h-[90vh]" key={item.id}>
            <source src={getMediaUrl(item.contentUrl)} type="video/mp4" />
          </video>
        )}

        {isYouTube && youtubeEmbed && (
          <div className="w-[90vw] max-w-[1280px] aspect-video">
            <iframe
              src={youtubeEmbed}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              key={item.id}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

function ContentCard({
  item,
  onClick,
}: {
  item: Content;
  onClick: () => void;
}) {
  const isYouTube = item.contentType === "VIDEO_YOUTUBE";
  const isVideo =
    item.contentType === "UPLOAD" && item.contentUrl?.match(/\.(mp4|webm)$/i);
  const isImage = item.contentType === "UPLOAD" && !isVideo;
  const youtubeEmbed =
    isYouTube && item.contentUrl ? getYouTubeEmbedUrl(item.contentUrl) : null;

  return (
    <div className="cursor-pointer" onClick={onClick}>
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {isYouTube && youtubeEmbed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <img
              src={`https://img.youtube.com/vi/${youtubeEmbed.split("/embed/")[1]}/hqdefault.jpg`}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        )}
        {isVideo && item.contentUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <video className="w-full h-full object-contain" muted>
              <source src={getMediaUrl(item.contentUrl)} type="video/mp4" />
            </video>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-14 border-l-white border-b-8 border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        )}
        {isImage && item.contentUrl && (
          <Image
            src={getMediaUrl(item.contentUrl)}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized={true}
          />
        )}
      </div>
    </div>
  );
}

export function ContentSection({ contents }: ContentSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  if (contents.length === 0) {
    return <Text c="dimmed">No content available.</Text>;
  }

  return (
    <>
      <Text
        size="sm"
        fw={500}
        mb="xs"
        ta="center"
        style={{ wordBreak: "break-word" }}
      >
        {contents[currentSlide]?.title}
      </Text>
      <Carousel
        slideSize="100%"
        slideGap="md"
        emblaOptions={{ loop: contents.length > 1 }}
        withIndicators
        withControls={contents.length > 1}
        onSlideChange={setCurrentSlide}
      >
        {contents.map((item, index) => (
          <Carousel.Slide key={item.id}>
            <ContentCard item={item} onClick={() => setSelectedIndex(index)} />
          </Carousel.Slide>
        ))}
      </Carousel>

      <ContentLightbox
        contents={contents}
        selectedIndex={selectedIndex}
        onClose={() => setSelectedIndex(null)}
        onNavigate={setSelectedIndex}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import {
  TextInput,
  Textarea,
  Stack,
  Group,
  FileButton,
  Button,
  Text,
  Progress,
  Card,
  Radio,
  Image,
} from "@mantine/core";
import { IconUpload, IconBrandYoutube } from "@tabler/icons-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { getMediaUrl } from "@/lib/media-url";
import type { ContentFormData } from "../types";

interface ContentFormProps {
  content: ContentFormData;
  onChange: (content: ContentFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  tempSlug: string;
  index: number;
  errors?: Record<string, string>;
}

const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];

function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
  )?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

export function ContentForm({
  content,
  onChange,
  onRemove,
  canRemove,
  tempSlug,
  index,
  errors = {},
}: ContentFormProps) {
  const [preview, setPreview] = useState<string | null>(
    content.contentUrl && content.contentType !== "VIDEO_YOUTUBE"
      ? getMediaUrl(content.contentUrl)
      : null,
  );

  const {
    upload,
    uploading,
    progress,
    error: uploadError,
  } = useFileUpload({
    category: "content",
    cultureSlug: tempSlug,
    onSuccess: (result) => {
      onChange({ ...content, contentUrl: result.url });
      setPreview(getMediaUrl(result.url));
    },
  });

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;
    await upload(file);
  };

  const handleTypeChange = (type: ContentFormData["contentType"]) => {
    onChange({ ...content, contentType: type, contentUrl: "" });
    setPreview(null);
  };

  const errorPrefix = `contents.${index}`;
  const youtubeEmbed =
    content.contentType === "VIDEO_YOUTUBE" && content.contentUrl
      ? getYouTubeEmbedUrl(content.contentUrl)
      : null;

  return (
    <Card withBorder p="md">
      <Stack gap="sm">
        <Textarea
          label="Let us know what this content is about"
          placeholder="e.g., 'Favorite Dishes', 'Traditional Clothing', 'Folk Tales'"
          required
          value={content.title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          error={errors[`${errorPrefix}.title`]}
        />

        <Radio.Group
          label=""
          required
          value={content.contentType}
          onChange={(value) =>
            handleTypeChange(value as ContentFormData["contentType"])
          }
        >
          <Group mt="xs">
            <Radio value="UPLOAD" label="Upload" />
            <Radio value="VIDEO_YOUTUBE" label="YouTube" />
          </Group>
        </Radio.Group>

        {/* Upload input for UPLOAD type (images and videos) */}
        {content.contentType === "UPLOAD" && (
          <div>
            {preview ? (
              <div>
                {content.contentUrl?.match(/\.(mp4|webm)$/i) ? (
                  <video
                    controls
                    style={{ width: "100%", aspectRatio: "16/9" }}
                  >
                    <source src={preview} type="video/mp4" />
                  </video>
                ) : (
                  <Image
                    src={preview}
                    alt="Preview"
                    w="100%"
                    h="auto"
                    mah={300}
                    fit="contain"
                    radius="sm"
                  />
                )}
              </div>
            ) : (
              <FileButton
                onChange={handleFileSelect}
                accept={ALLOWED_MEDIA_TYPES.join(",")}
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    leftSection={<IconUpload size={16} />}
                    loading={uploading}
                  >
                    Upload Media
                  </Button>
                )}
              </FileButton>
            )}

            {uploading && <Progress value={progress} size="sm" mt="xs" />}

            {uploadError && (
              <Text size="xs" c="red" mt="xs">
                {uploadError}
              </Text>
            )}

            <Text size="xs" c="dimmed" mt="xs">
              PNG, JPG, WebP, GIF (max 100MB) or MP4, WebM (max 5 min)
            </Text>
          </div>
        )}

        {/* YouTube URL input */}
        {content.contentType === "VIDEO_YOUTUBE" && (
          <div>
            <TextInput
              label="YouTube URL"
              placeholder="https://youtube.com/watch?v=..."
              leftSection={<IconBrandYoutube size={16} />}
              required
              value={content.contentUrl}
              onChange={(e) =>
                onChange({ ...content, contentUrl: e.target.value })
              }
              error={errors[`${errorPrefix}.contentUrl`]}
            />

            {youtubeEmbed && (
              <div className="mt-2" style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={youtubeEmbed}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded"
                />
              </div>
            )}
          </div>
        )}

        {errors[`${errorPrefix}.contentUrl`] &&
          content.contentType !== "VIDEO_YOUTUBE" && (
            <Text size="xs" c="red">
              {errors[`${errorPrefix}.contentUrl`]}
            </Text>
          )}

        {canRemove && (
          <Button variant="light" color="red" size="xs" onClick={onRemove}>
            Remove content
          </Button>
        )}
      </Stack>
    </Card>
  );
}

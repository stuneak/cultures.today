"use client";

import { useState } from "react";
import {
  TextInput,
  Stack,
  Group,
  ActionIcon,
  FileButton,
  Button,
  Text,
  Progress,
  Card,
  Radio,
  Image,
} from "@mantine/core";
import {
  IconUpload,
  IconTrash,
  IconCheck,
  IconBrandYoutube,
} from "@tabler/icons-react";
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

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

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
    nationSlug: tempSlug,
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
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            {" "}
          </Text>
          {canRemove && (
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              onClick={onRemove}
            >
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>

        <TextInput
          label="Title"
          placeholder="Enter content title"
          required
          value={content.title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          error={errors[`${errorPrefix}.title`]}
        />

        <Radio.Group
          label="Category"
          required
          value={content.category}
          onChange={(value) =>
            onChange({
              ...content,
              category: value as ContentFormData["category"],
            })
          }
          error={errors[`${errorPrefix}.category`]}
        >
          <Group mt="xs">
            <Radio value="FOOD" label="Food" />
            <Radio value="MUSIC" label="Music" />
            <Radio value="OTHER" label="Other" />
          </Group>
        </Radio.Group>

        <Radio.Group
          label="Content Type"
          required
          value={content.contentType}
          onChange={(value) =>
            handleTypeChange(value as ContentFormData["contentType"])
          }
        >
          <Group mt="xs">
            <Radio value="IMAGE_UPLOAD" label="Image" />
            <Radio value="VIDEO_UPLOAD" label="Video" />
            <Radio value="VIDEO_YOUTUBE" label="YouTube" />
          </Group>
        </Radio.Group>

        {/* Upload input for IMAGE_UPLOAD or VIDEO_UPLOAD */}
        {(content.contentType === "IMAGE_UPLOAD" ||
          content.contentType === "VIDEO_UPLOAD") && (
          <div>
            {preview ? (
              <div className="relative">
                {content.contentType === "IMAGE_UPLOAD" ? (
                  <Image
                    src={preview}
                    alt="Preview"
                    w={200}
                    h={120}
                    fit="cover"
                    radius="sm"
                  />
                ) : (
                  <video controls style={{ width: 200, height: 120 }}>
                    <source src={preview} type="video/mp4" />
                  </video>
                )}
                <ActionIcon
                  size="sm"
                  color="green"
                  variant="light"
                  className="absolute top-1 right-1"
                >
                  <IconCheck size={14} />
                </ActionIcon>
              </div>
            ) : (
              <FileButton
                onChange={handleFileSelect}
                accept={
                  content.contentType === "IMAGE_UPLOAD"
                    ? ALLOWED_IMAGE_TYPES.join(",")
                    : ALLOWED_VIDEO_TYPES.join(",")
                }
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    leftSection={<IconUpload size={16} />}
                    loading={uploading}
                  >
                    Upload{" "}
                    {content.contentType === "IMAGE_UPLOAD" ? "Image" : "Video"}
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
              {content.contentType === "IMAGE_UPLOAD"
                ? "PNG, JPG, WebP, GIF (max 100MB)"
                : "MP4, WebM (max 5 min)"}
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
              <div className="mt-2">
                <iframe
                  src={youtubeEmbed}
                  width={200}
                  height={120}
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
      </Stack>
    </Card>
  );
}

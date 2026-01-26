"use client";

import { useState } from "react";
import {
  TextInput,
  Textarea,
  Stack,
  Text,
  Image,
  ActionIcon,
  FileButton,
  Button,
  Progress,
} from "@mantine/core";
import { IconUpload, IconX } from "@tabler/icons-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { getMediaUrl } from "@/lib/media-url";
import type { WizardFormData } from "../types";

interface BasicInfoStepProps {
  data: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  tempSlug: string;
  errors: Record<string, string>;
}

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

export function BasicInfoStep({
  data,
  onChange,
  tempSlug,
  errors,
}: BasicInfoStepProps) {
  const [flagPreview, setFlagPreview] = useState<string | null>(
    data.flagUrl ? getMediaUrl(data.flagUrl) : null
  );

  const {
    upload,
    uploading,
    progress,
    error: uploadError,
  } = useFileUpload({
    category: "flags",
    nationSlug: tempSlug,
    onSuccess: (result) => {
      onChange({ flagUrl: result.url });
      setFlagPreview(getMediaUrl(result.url));
    },
  });

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return;
    }

    await upload(file);
  };

  const handleRemoveFlag = () => {
    onChange({ flagUrl: "" });
    setFlagPreview(null);
  };

  return (
    <Stack gap="md">
      <TextInput
        label="Nation Name"
        placeholder="Enter the nation's name"
        required
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
        error={errors.name}
      />

      <Textarea
        label="Description"
        placeholder="Describe this nation's history and culture"
        rows={4}
        value={data.description}
        onChange={(e) => onChange({ description: e.target.value })}
        error={errors.description}
      />

      <div>
        <Text size="sm" fw={500} mb="xs">
          Flag (optional)
        </Text>

        {flagPreview ? (
          <div className="relative inline-block">
            <Image
              src={flagPreview}
              alt="Flag preview"
              w={120}
              h={80}
              fit="contain"
              radius="sm"
              className="border"
            />
            <ActionIcon
              size="sm"
              color="red"
              variant="filled"
              className="absolute -top-2 -right-2"
              onClick={handleRemoveFlag}
            >
              <IconX size={14} />
            </ActionIcon>
          </div>
        ) : (
          <FileButton
            onChange={handleFileSelect}
            accept={ALLOWED_IMAGE_TYPES.join(",")}
          >
            {(props) => (
              <Button
                {...props}
                variant="light"
                leftSection={<IconUpload size={16} />}
                loading={uploading}
              >
                Upload Flag
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
          PNG, JPG, WebP, or SVG (max 5MB)
        </Text>
      </div>
    </Stack>
  );
}

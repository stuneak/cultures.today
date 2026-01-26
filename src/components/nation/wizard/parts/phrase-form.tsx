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
} from "@mantine/core";
import { IconUpload, IconTrash, IconCheck } from "@tabler/icons-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { getMediaUrl } from "@/lib/media-url";
import type { PhraseFormData } from "../types";

interface PhraseFormProps {
  phrase: PhraseFormData;
  onChange: (phrase: PhraseFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  tempSlug: string;
  index: number;
  errors?: Record<string, string>;
}

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp3",
];

export function PhraseForm({
  phrase,
  onChange,
  onRemove,
  canRemove,
  tempSlug,
  index,
  errors = {},
}: PhraseFormProps) {
  const [audioPreview, setAudioPreview] = useState<string | null>(
    phrase.audioUrl ? getMediaUrl(phrase.audioUrl) : null
  );

  const {
    upload,
    uploading,
    progress,
    error: uploadError,
  } = useFileUpload({
    category: "audio",
    nationSlug: tempSlug,
    onSuccess: (result) => {
      onChange({ ...phrase, audioUrl: result.url });
      setAudioPreview(getMediaUrl(result.url));
    },
  });

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;
    await upload(file);
  };

  return (
    <Card withBorder p="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            Phrase {index + 1}
          </Text>
          {canRemove && (
            <ActionIcon size="sm" color="red" variant="subtle" onClick={onRemove}>
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>

        <TextInput
          label="Original Text"
          placeholder="Enter phrase in the language"
          size="xs"
          required
          value={phrase.text}
          onChange={(e) => onChange({ ...phrase, text: e.target.value })}
          error={errors[`phrases.${index}.text`]}
        />

        <TextInput
          label="Translation"
          placeholder="Enter English translation"
          size="xs"
          required
          value={phrase.translation}
          onChange={(e) => onChange({ ...phrase, translation: e.target.value })}
          error={errors[`phrases.${index}.translation`]}
        />

        <div>
          <Text size="xs" fw={500} mb={4}>
            Audio Recording *
          </Text>

          {audioPreview ? (
            <Group gap="xs">
              <audio controls className="h-8" style={{ width: 200 }}>
                <source src={audioPreview} type="audio/mpeg" />
              </audio>
              <ActionIcon size="sm" color="green" variant="light">
                <IconCheck size={14} />
              </ActionIcon>
            </Group>
          ) : (
            <FileButton
              onChange={handleFileSelect}
              accept={ALLOWED_AUDIO_TYPES.join(",")}
            >
              {(props) => (
                <Button
                  {...props}
                  size="xs"
                  variant="light"
                  leftSection={<IconUpload size={14} />}
                  loading={uploading}
                >
                  Upload Audio
                </Button>
              )}
            </FileButton>
          )}

          {uploading && <Progress value={progress} size="xs" mt="xs" />}

          {uploadError && (
            <Text size="xs" c="red" mt="xs">
              {uploadError}
            </Text>
          )}

          {errors[`phrases.${index}.audioUrl`] && (
            <Text size="xs" c="red" mt="xs">
              {errors[`phrases.${index}.audioUrl`]}
            </Text>
          )}
        </div>
      </Stack>
    </Card>
  );
}

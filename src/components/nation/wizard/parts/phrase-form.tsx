"use client";

import { useMemo } from "react";
import {
  TextInput,
  Stack,
  Group,
  ActionIcon,
  Button,
  Text,
  Progress,
  Card,
  Tooltip,
} from "@mantine/core";
import {
  IconMicrophone,
  IconPlayerStop,
  IconTrash,
  IconCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { getMediaUrl } from "@/lib/media-url";
import { Waveform } from "@/components/ui/waveform";
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PhraseForm({
  phrase,
  onChange,
  onRemove,
  canRemove,
  tempSlug,
  index,
  errors = {},
}: PhraseFormProps) {
  // Compute saved audio URL directly from prop
  const savedAudioUrl = useMemo(
    () => (phrase.audioUrl ? getMediaUrl(phrase.audioUrl) : null),
    [phrase.audioUrl]
  );

  const {
    state: recorderState,
    audioBlob,
    audioUrl: previewUrl,
    duration,
    analyserNode,
    error: recorderError,
    isWarning,
    start,
    stop,
    reset,
    markSaved,
  } = useAudioRecorder({
    maxDuration: 300,
    warnAt: 30,
  });

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
      markSaved();
    },
  });

  const handleSave = async () => {
    if (!audioBlob) return;
    // Create a File from the Blob for upload
    const file = new File([audioBlob], "recording.webm", {
      type: "audio/webm",
    });
    await upload(file);
  };

  const handleReRecord = () => {
    reset();
    // Clear saved audio if re-recording
    if (recorderState === "saved" || savedAudioUrl) {
      onChange({ ...phrase, audioUrl: "" });
    }
  };

  const error = recorderError || uploadError;

  return (
    <Card withBorder p="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            Phrase {index + 1}
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

          {/* IDLE state */}
          {recorderState === "idle" && !savedAudioUrl && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconMicrophone size={14} />}
              onClick={start}
            >
              Record
            </Button>
          )}

          {/* RECORDING state */}
          {recorderState === "recording" && (
            <Stack gap="xs">
              <Group gap="xs">
                <Waveform
                  analyserNode={analyserNode}
                  isRecording={true}
                  width={160}
                  height={32}
                />
                <Button
                  size="xs"
                  variant="filled"
                  color="red"
                  leftSection={<IconPlayerStop size={14} />}
                  onClick={stop}
                >
                  Stop
                </Button>
              </Group>
              <Tooltip
                label="Recordings over 5 minutes will be cut off"
                disabled={!isWarning}
                opened={isWarning}
                position="bottom"
                withArrow
              >
                <Text
                  size="xs"
                  c={isWarning ? "orange" : "dimmed"}
                  fw={isWarning ? 500 : 400}
                >
                  {formatDuration(duration)}
                </Text>
              </Tooltip>
            </Stack>
          )}

          {/* PREVIEW state */}
          {recorderState === "preview" && previewUrl && (
            <Stack gap="xs">
              <audio controls style={{ width: 200, height: 32 }}>
                <source src={previewUrl} type="audio/webm" />
              </audio>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="filled"
                  leftSection={<IconCheck size={14} />}
                  onClick={handleSave}
                  loading={uploading}
                >
                  Save
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconRefresh size={14} />}
                  onClick={handleReRecord}
                  disabled={uploading}
                >
                  Re-record
                </Button>
              </Group>
            </Stack>
          )}

          {/* SAVED state */}
          {(recorderState === "saved" || savedAudioUrl) &&
            recorderState !== "recording" &&
            recorderState !== "preview" && (
              <Stack gap="xs">
                <Group gap="xs">
                  <audio controls style={{ width: 200, height: 32 }}>
                    <source
                      src={savedAudioUrl || previewUrl || ""}
                      type="audio/webm"
                    />
                  </audio>
                  <ActionIcon size="sm" color="green" variant="light">
                    <IconCheck size={14} />
                  </ActionIcon>
                </Group>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconRefresh size={14} />}
                  onClick={handleReRecord}
                >
                  Re-record
                </Button>
              </Stack>
            )}

          {uploading && <Progress value={progress} size="xs" mt="xs" />}

          {error && (
            <Text size="xs" c="red" mt="xs">
              {error}
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

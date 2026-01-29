"use client";

import { useMemo, useEffect, useCallback } from "react";
import {
  TextInput,
  Stack,
  Group,
  Button,
  Text,
  Progress,
  Card,
  Tooltip,
} from "@mantine/core";
import {
  IconMicrophone,
  IconPlayerStop,
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
  errorPrefix: string;
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
  errorPrefix,
  errors = {},
}: PhraseFormProps) {
  // Compute saved audio URL directly from prop
  const savedAudioUrl = useMemo(
    () => (phrase.audioUrl ? getMediaUrl(phrase.audioUrl) : null),
    [phrase.audioUrl],
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
    cultureSlug: tempSlug,
    onSuccess: (result) => {
      onChange({ ...phrase, audioUrl: result.url });
    },
  });

  const handleSave = useCallback(async () => {
    if (!audioBlob) return;
    // Create a File from the Blob for upload
    const file = new File([audioBlob], "recording.webm", {
      type: "audio/webm",
    });
    await upload(file);
  }, [audioBlob, upload]);

  // Auto-save when recording stops
  useEffect(() => {
    if (
      recorderState === "saved" &&
      audioBlob &&
      !phrase.audioUrl &&
      !uploading
    ) {
      handleSave();
    }
  }, [recorderState, audioBlob, phrase.audioUrl, uploading, handleSave]);

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
        <TextInput
          label="Original Text"
          placeholder="Phrase in the language, e.g., Hola"
          size="xs"
          required
          value={phrase.text}
          onChange={(e) => onChange({ ...phrase, text: e.target.value })}
          error={errors[`${errorPrefix}.text`]}
        />

        <TextInput
          label="Translation"
          placeholder="English translation, e.g., Hello"
          size="xs"
          required
          value={phrase.translation}
          onChange={(e) => onChange({ ...phrase, translation: e.target.value })}
          error={errors[`${errorPrefix}.translation`]}
        />

        <div>
          <Text size="xs" fw={500} mb={4}>
            Audio Recording
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

          {/* SAVED state */}
          {(recorderState === "saved" || savedAudioUrl) &&
            recorderState !== "recording" && (
              <Stack gap="xs">
                <Group gap="xs">
                  <audio controls style={{ height: 32, width: "100%" }}>
                    <source
                      src={savedAudioUrl || previewUrl || ""}
                      type="audio/webm"
                    />
                  </audio>
                  {uploading && <Progress value={progress} size="xs" w={100} />}
                </Group>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconRefresh size={14} />}
                  onClick={handleReRecord}
                  disabled={uploading}
                >
                  Re-record
                </Button>
              </Stack>
            )}

          {error && (
            <Text size="xs" c="red" mt="xs">
              {error}
            </Text>
          )}

          {errors[`${errorPrefix}.audioUrl`] && (
            <Text size="xs" c="red" mt="xs">
              {errors[`${errorPrefix}.audioUrl`]}
            </Text>
          )}
        </div>

        {canRemove && (
          <Button variant="light" color="red" size="xs" onClick={onRemove}>
            Remove phrase
          </Button>
        )}
      </Stack>
    </Card>
  );
}

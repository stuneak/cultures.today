"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Text,
  Skeleton,
  Divider,
  Badge,
  Paper,
  Modal,
  FileButton,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconTrash, IconDeviceFloppy, IconUpload, IconX } from "@tabler/icons-react";
import { getMediaUrl } from "@/lib/media-url";
import Image from "next/image";

interface Phrase {
  id: string;
  text: string;
  translation: string;
  audioUrl: string | null;
}

interface Language {
  id: string;
  name: string;
  phrases: Phrase[];
}

interface Content {
  id: string;
  title: string;
  contentType: "UPLOAD" | "VIDEO_YOUTUBE";
  contentUrl: string | null;
}

interface CultureDetails {
  id: string;
  name: string;
  slug: string;
  state: "pending" | "approved";
  description: string | null;
  flagUrl: string | null;
  languages: Language[];
  contents: Content[];
  submittedBy: { id: string; email: string } | null;
}

interface EditableLanguage {
  id: string;
  name: string;
  phrases: {
    id: string;
    text: string;
    translation: string;
    audioUrl?: string;
  }[];
}

interface EditableContent {
  id: string;
  title: string;
  contentType: "UPLOAD" | "VIDEO_YOUTUBE";
  contentUrl: string | null;
}

interface CultureEditorProps {
  slug: string;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function CultureEditor({ slug, onUpdated, onDeleted }: CultureEditorProps) {
  const [culture, setCulture] = useState<CultureDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingFlag, setUploadingFlag] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flagUrl, setFlagUrl] = useState<string | null>(null);
  const [languages, setLanguages] = useState<EditableLanguage[]>([]);
  const [contents, setContents] = useState<EditableContent[]>([]);

  // Delete confirmation modal
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  const resetRef = useRef<() => void>(null);

  // Fetch culture details
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/cultures/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        setCulture(data);
        setName(data.name || "");
        setDescription(data.description || "");
        setFlagUrl(data.flagUrl);
        setLanguages(
          data.languages.map((lang: Language) => ({
            id: lang.id,
            name: lang.name,
            phrases: lang.phrases.map((p) => ({
              id: p.id,
              text: p.text,
              translation: p.translation,
              audioUrl: p.audioUrl || undefined,
            })),
          }))
        );
        setContents(
          data.contents.map((c: Content) => ({
            id: c.id,
            title: c.title,
            contentType: c.contentType,
            contentUrl: c.contentUrl,
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to fetch culture:", err);
        notifications.show({
          message: "Failed to load culture details",
          color: "red",
        });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleFlagUpload = async (file: File | null) => {
    if (!file || !culture) return;

    setUploadingFlag(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "flags");
      formData.append("cultureSlug", culture.slug);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setFlagUrl(data.url);

      notifications.show({
        message: "Flag uploaded",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("Flag upload error:", err);
      notifications.show({
        message: "Failed to upload flag",
        color: "red",
      });
    } finally {
      setUploadingFlag(false);
      resetRef.current?.();
    }
  };

  const updateLanguageName = (langIndex: number, newName: string) => {
    setLanguages((prev) =>
      prev.map((lang, i) => (i === langIndex ? { ...lang, name: newName } : lang))
    );
  };

  const updatePhraseText = (langIndex: number, phraseIndex: number, newText: string) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? {
              ...lang,
              phrases: lang.phrases.map((p, pi) =>
                pi === phraseIndex ? { ...p, text: newText } : p
              ),
            }
          : lang
      )
    );
  };

  const updatePhraseTranslation = (langIndex: number, phraseIndex: number, newTranslation: string) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? {
              ...lang,
              phrases: lang.phrases.map((p, pi) =>
                pi === phraseIndex ? { ...p, translation: newTranslation } : p
              ),
            }
          : lang
      )
    );
  };

  const updateContentTitle = (contentIndex: number, newTitle: string) => {
    setContents((prev) =>
      prev.map((c, i) => (i === contentIndex ? { ...c, title: newTitle } : c))
    );
  };

  const removeLanguage = (langIndex: number) => {
    setLanguages((prev) => prev.filter((_, i) => i !== langIndex));
  };

  const removePhrase = (langIndex: number, phraseIndex: number) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? { ...lang, phrases: lang.phrases.filter((_, pi) => pi !== phraseIndex) }
          : lang
      )
    );
  };

  const removeContent = (contentIndex: number) => {
    setContents((prev) => prev.filter((_, i) => i !== contentIndex));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cultures/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          flagUrl,
          languages: languages.map((lang) => ({
            name: lang.name,
            phrases: lang.phrases.map((p) => ({
              text: p.text,
              translation: p.translation,
              audioUrl: p.audioUrl,
            })),
          })),
          contents: contents.map((c) => ({
            title: c.title,
            contentType: c.contentType,
            contentUrl: c.contentUrl,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Refetch to get updated data
      const updated = await fetch(`/api/admin/cultures/${slug}`).then((r) => r.json());
      setCulture(updated);

      notifications.show({
        message: "Culture updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onUpdated();
    } catch (err) {
      console.error("Save error:", err);
      notifications.show({
        message: "Failed to save changes",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cultures/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "approved" }),
      });

      if (!res.ok) throw new Error("Failed to approve");

      notifications.show({
        message: "Culture approved successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onUpdated();
    } catch (err) {
      console.error("Approve error:", err);
      notifications.show({
        message: "Failed to approve culture",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cultures/${slug}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      notifications.show({
        message: "Culture deleted successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      closeDeleteModal();
      onDeleted();
    } catch (err) {
      console.error("Delete error:", err);
      notifications.show({
        message: "Failed to delete culture",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box p="lg">
        <Stack gap="md">
          <Skeleton height={40} />
          <Skeleton height={100} />
          <Skeleton height={200} />
        </Stack>
      </Box>
    );
  }

  if (!culture) {
    return (
      <Box p="lg">
        <Text c="red">Failed to load culture</Text>
      </Box>
    );
  }

  // Check if there are any changes
  const hasBasicChanges =
    name !== culture.name ||
    description !== (culture.description || "") ||
    flagUrl !== culture.flagUrl;

  const hasLanguageChanges = JSON.stringify(languages) !== JSON.stringify(
    culture.languages.map((lang) => ({
      id: lang.id,
      name: lang.name,
      phrases: lang.phrases.map((p) => ({
        id: p.id,
        text: p.text,
        translation: p.translation,
        audioUrl: p.audioUrl || undefined,
      })),
    }))
  );

  const hasContentChanges = JSON.stringify(contents) !== JSON.stringify(
    culture.contents.map((c) => ({
      id: c.id,
      title: c.title,
      contentType: c.contentType,
      contentUrl: c.contentUrl,
    }))
  );

  const hasChanges = hasBasicChanges || hasLanguageChanges || hasContentChanges;

  return (
    <Box p="lg">
      <Stack gap="lg">
        {/* Header with status */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Text size="xl" fw={600}>
              {culture.name}
            </Text>
            <Badge color={culture.state === "approved" ? "green" : "yellow"}>
              {culture.state}
            </Badge>
          </Group>
          {culture.submittedBy && (
            <Text size="sm" c="dimmed">
              Submitted by: {culture.submittedBy.email}
            </Text>
          )}
        </Group>

        <Divider />

        {/* Basic Info */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <TextInput
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <TextInput label="Slug" value={culture.slug} disabled />

            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minRows={3}
              autosize
            />

            {/* Flag with upload */}
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Flag
              </Text>
              <Group align="flex-end" gap="md">
                {flagUrl && (
                  <div className="relative w-16 h-12">
                    <Image
                      src={getMediaUrl(flagUrl)}
                      alt={`${culture.name} flag`}
                      fill
                      className="object-contain rounded border"
                      unoptimized
                    />
                  </div>
                )}
                <FileButton
                  resetRef={resetRef}
                  onChange={handleFlagUpload}
                  accept="image/*"
                >
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      size="xs"
                      leftSection={<IconUpload size={14} />}
                      loading={uploadingFlag}
                    >
                      {flagUrl ? "Change" : "Upload"}
                    </Button>
                  )}
                </FileButton>
              </Group>
            </Box>
          </Stack>
        </Paper>

        {/* Languages */}
        <Paper p="md" withBorder>
          <Group gap="xs" mb="md">
            <Text fw={600}>Languages</Text>
            <Badge size="sm" variant="light">
              {languages.length}
            </Badge>
          </Group>
          {languages.length === 0 ? (
            <Text c="dimmed" size="sm">
              No languages added
            </Text>
          ) : (
            <Stack gap="md">
              {languages.map((lang, langIndex) => (
                <Paper key={lang.id} p="sm" withBorder>
                  <Group gap="xs" mb="xs">
                    <TextInput
                      value={lang.name}
                      onChange={(e) => updateLanguageName(langIndex, e.target.value)}
                      size="sm"
                      style={{ flex: 1 }}
                      styles={{ input: { fontWeight: 500 } }}
                      placeholder="Language name"
                    />
                    <Tooltip label="Remove language">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeLanguage(langIndex)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Stack gap="xs">
                    {lang.phrases.map((phrase, phraseIndex) => (
                      <Paper key={phrase.id} p="sm" withBorder bg="gray.0">
                        <Group align="flex-start" gap="xs">
                          <Stack gap="xs" style={{ flex: 1 }}>
                            <TextInput
                              label="Original"
                              value={phrase.text}
                              onChange={(e) =>
                                updatePhraseText(langIndex, phraseIndex, e.target.value)
                              }
                              size="sm"
                            />
                            <TextInput
                              label="Translation"
                              value={phrase.translation}
                              onChange={(e) =>
                                updatePhraseTranslation(langIndex, phraseIndex, e.target.value)
                              }
                              size="sm"
                            />
                            {phrase.audioUrl && (
                              <Box mt="xs">
                                <audio
                                  controls
                                  src={getMediaUrl(phrase.audioUrl)}
                                  style={{ width: "100%", height: 32 }}
                                />
                              </Box>
                            )}
                          </Stack>
                          <Tooltip label="Remove phrase">
                            <ActionIcon
                              color="red"
                              variant="light"
                              mt={24}
                              onClick={() => removePhrase(langIndex, phraseIndex)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Contents */}
        <Paper p="md" withBorder>
          <Group gap="xs" mb="md">
            <Text fw={600}>Content</Text>
            <Badge size="sm" variant="light">
              {contents.length}
            </Badge>
          </Group>
          {contents.length === 0 ? (
            <Text c="dimmed" size="sm">
              No content added
            </Text>
          ) : (
            <Stack gap="md">
              {contents.map((content, contentIndex) => {
                const isYouTube = content.contentType === "VIDEO_YOUTUBE";
                const isVideo =
                  content.contentType === "UPLOAD" &&
                  content.contentUrl?.match(/\.(mp4|webm)$/i);
                const isImage = content.contentType === "UPLOAD" && !isVideo;
                const youtubeId =
                  isYouTube && content.contentUrl
                    ? content.contentUrl.match(
                        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/
                      )?.[1]
                    : null;

                return (
                  <Paper key={content.id} p="sm" withBorder>
                    <Group justify="space-between" align="flex-start" mb="sm" gap="xs">
                      <TextInput
                        value={content.title}
                        onChange={(e) => updateContentTitle(contentIndex, e.target.value)}
                        size="sm"
                        style={{ flex: 1 }}
                        styles={{ input: { fontWeight: 500 } }}
                      />
                      <Badge size="xs" variant="light">
                        {content.contentType}
                      </Badge>
                      <Tooltip label="Remove content">
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => removeContent(contentIndex)}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>

                    {/* YouTube embed */}
                    {isYouTube && youtubeId && (
                      <Box
                        style={{
                          position: "relative",
                          paddingBottom: "56.25%",
                          height: 0,
                        }}
                      >
                        <iframe
                          src={`https://www.youtube.com/embed/${youtubeId}`}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            border: 0,
                            borderRadius: 8,
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </Box>
                    )}

                    {/* Video player */}
                    {isVideo && content.contentUrl && (
                      <video controls style={{ width: "100%", borderRadius: 8 }}>
                        <source
                          src={getMediaUrl(content.contentUrl)}
                          type="video/mp4"
                        />
                      </video>
                    )}

                    {/* Image */}
                    {isImage && content.contentUrl && (
                      <Box
                        style={{
                          position: "relative",
                          width: "100%",
                          aspectRatio: "16/9",
                        }}
                      >
                        <Image
                          src={getMediaUrl(content.contentUrl)}
                          alt={content.title}
                          fill
                          style={{ objectFit: "contain", borderRadius: 8 }}
                          unoptimized
                        />
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>

        <Divider />

        {/* Actions */}
        <Group justify="space-between">
          <Button
            color="red"
            variant="outline"
            leftSection={<IconTrash size={16} />}
            onClick={openDeleteModal}
          >
            Delete
          </Button>

          <Group>
            {culture.state === "pending" && (
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={handleApprove}
                loading={saving}
              >
                Approve
              </Button>
            )}
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
          </Group>
        </Group>
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Culture"
        centered
      >
        <Stack gap="md">
          <Text>
            Delete <strong>{culture.name}</strong>? This will permanently remove
            the culture and all associated files. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

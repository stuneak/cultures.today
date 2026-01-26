# Nation Submit Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the simple nation submission form with a 5-step wizard that collects full nation data including flag upload, map preview, languages with phrases, and content items.

**Architecture:** Wizard container manages step state and form data. Each step is an isolated component. File uploads happen immediately to MinIO and store URLs in form state. Final submit creates nation with nested languages/contents in a single API transaction.

**Tech Stack:** React, Mantine UI (Stepper, Modal, forms), MapLibre GL, Zod validation, Prisma transactions

---

## Task 1: Update Validation Schema

**Files:**
- Modify: `src/lib/validations/nation.ts`

**Step 1: Add nested schemas for languages and contents**

```typescript
import { z } from "zod";

export const nationQuerySchema = z.object({
  search: z.string().optional(),
  state: z.enum(["approved", "pending"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Phrase schema
export const phraseSchema = z.object({
  text: z.string().min(1, "Phrase text is required"),
  translation: z.string().min(1, "Translation is required"),
  audioUrl: z.string().min(1, "Audio is required"),
});

// Language schema with phrases
export const languageSchema = z.object({
  name: z.string().min(1, "Language name is required"),
  description: z.string().min(1, "Language description is required"),
  phrases: z.array(phraseSchema).min(1, "At least one phrase is required"),
});

// Content schema
export const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contentType: z.enum(["IMAGE_UPLOAD", "VIDEO_UPLOAD", "VIDEO_YOUTUBE"]),
  category: z.enum(["FOOD", "MUSIC", "OTHER"]),
  contentUrl: z.string().min(1, "Content URL is required"),
});

// YouTube URL validation helper
export const youtubeUrlSchema = z.string().regex(
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/,
  "Invalid YouTube URL"
);

// Full nation submit schema with nested data
export const nationSubmitSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().optional(),
  flagUrl: z.string().optional(),
  boundaryGeoJson: z.string().min(1, "Boundary is required"),
  languages: z.array(languageSchema).min(1, "At least one language is required"),
  contents: z.array(contentSchema).min(1, "At least one content item is required"),
});

export const nationUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  flagUrl: z.string().optional(),
  boundaryGeoJson: z.string().optional(),
  state: z.enum(["approved", "pending"]).optional(),
});

export type NationQuery = z.infer<typeof nationQuerySchema>;
export type NationSubmit = z.infer<typeof nationSubmitSchema>;
export type NationUpdate = z.infer<typeof nationUpdateSchema>;
export type LanguageInput = z.infer<typeof languageSchema>;
export type PhraseInput = z.infer<typeof phraseSchema>;
export type ContentInput = z.infer<typeof contentSchema>;
```

**Step 2: Commit**

```bash
git add src/lib/validations/nation.ts
git commit -m "feat: add nested validation schemas for wizard"
```

---

## Task 2: Update Upload API to Support Temporary Slugs

**Files:**
- Modify: `src/app/api/upload/route.ts`

**Step 1: Allow "temp" prefix for nationSlug during wizard flow**

The current upload API requires a `nationSlug`. For wizard flow, we'll use a temporary identifier like `temp-{timestamp}` since the nation doesn't exist yet.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/minio";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const nationSlug = formData.get("nationSlug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!category || !nationSlug) {
      return NextResponse.json(
        { error: "Category and nationSlug are required" },
        { status: 400 },
      );
    }

    const validCategories = ["flags", "audio", "content"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const result = await uploadFile(file, category, nationSlug);

    return NextResponse.json(
      {
        key: result.key,
        url: result.url,
        filename: file.name,
        size: file.size,
        type: file.type,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

No changes needed - the current implementation already accepts any string for `nationSlug`. We'll pass `temp-{timestamp}` from the frontend.

**Step 2: Commit (skip if no changes)**

---

## Task 3: Update Nations API to Accept Nested Data

**Files:**
- Modify: `src/app/api/nations/route.ts`

**Step 1: Update POST handler to create languages and contents in a transaction**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  nationQuerySchema,
  nationSubmitSchema,
} from "@/lib/validations/nation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Public - returns only approved nations (for map display)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = nationQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    // Public API only returns approved nations
    const where = {
      state: "approved" as const,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          {
            languages: {
              some: {
                name: { contains: query.search, mode: "insensitive" as const },
              },
            },
          },
        ],
      }),
    };

    const [nations, total] = await Promise.all([
      db.nation.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          flagUrl: true,
        },
        orderBy: { name: "asc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.nation.count({ where }),
    ]);

    return NextResponse.json({
      nations,
      pagination: { total, limit: query.limit, offset: query.offset },
    });
  } catch (error) {
    console.error("GET /api/nations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nations" },
      { status: 500 },
    );
  }
}

// POST: Anyone can submit a new nation (created as pending)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = nationSubmitSchema.parse(body);

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists
    const existing = await db.nation.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A nation with this name already exists" },
        { status: 409 },
      );
    }

    // Get current user if authenticated (optional)
    const session = await getServerSession(authOptions);

    // Create nation with nested languages and contents in a transaction
    const nation = await db.$transaction(async (tx) => {
      // Create the nation
      const newNation = await tx.nation.create({
        data: {
          name: data.name,
          description: data.description,
          flagUrl: data.flagUrl,
          slug,
          state: "pending",
          submittedById: session?.user?.id ?? null,
        },
        select: { id: true, name: true, slug: true, state: true },
      });

      // Create languages with phrases
      for (const lang of data.languages) {
        await tx.language.create({
          data: {
            name: lang.name,
            description: lang.description,
            nationId: newNation.id,
            phrases: {
              create: lang.phrases.map((phrase) => ({
                text: phrase.text,
                translation: phrase.translation,
                audioUrl: phrase.audioUrl,
              })),
            },
          },
        });
      }

      // Create contents
      await tx.content.createMany({
        data: data.contents.map((content) => ({
          title: content.title,
          contentType: content.contentType,
          category: content.category,
          contentUrl: content.contentUrl,
          nationId: newNation.id,
        })),
      });

      return newNation;
    });

    // If boundary GeoJSON was provided, set the PostGIS geometry column
    if (data.boundaryGeoJson) {
      await db.$executeRaw`
        UPDATE nations
        SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(${data.boundaryGeoJson}::json->'geometry'), 4326)
        WHERE id = ${nation.id}
      `;
    }

    return NextResponse.json(nation, { status: 201 });
  } catch (error) {
    console.error("POST /api/nations error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Nation with this name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to submit nation" },
      { status: 500 },
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/nations/route.ts
git commit -m "feat: support nested languages and contents in nation creation"
```

---

## Task 4: Create File Upload Hook

**Files:**
- Create: `src/hooks/use-file-upload.ts`

**Step 1: Create reusable upload hook**

```typescript
"use client";

import { useState, useCallback } from "react";

interface UploadResult {
  key: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

interface UseFileUploadOptions {
  category: "flags" | "audio" | "content";
  nationSlug: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export function useFileUpload({
  category,
  nationSlug,
  onSuccess,
  onError,
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        formData.append("nationSlug", nationSlug);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const result: UploadResult = await response.json();
        setProgress(100);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        onError?.(message);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [category, nationSlug, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return { upload, uploading, progress, error, reset };
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-file-upload.ts
git commit -m "feat: add file upload hook"
```

---

## Task 5: Create Wizard Form Types

**Files:**
- Create: `src/components/nation/wizard/types.ts`

**Step 1: Define shared types for wizard**

```typescript
export interface PhraseFormData {
  id: string; // local ID for React keys
  text: string;
  translation: string;
  audioUrl: string;
}

export interface LanguageFormData {
  id: string; // local ID for React keys
  name: string;
  description: string;
  phrases: PhraseFormData[];
}

export interface ContentFormData {
  id: string; // local ID for React keys
  title: string;
  contentType: "IMAGE_UPLOAD" | "VIDEO_UPLOAD" | "VIDEO_YOUTUBE";
  category: "FOOD" | "MUSIC" | "OTHER";
  contentUrl: string;
}

export interface WizardFormData {
  // Step 1: Basic Info
  name: string;
  description: string;
  flagUrl: string;

  // Step 2: Map (pre-filled)
  boundaryGeoJson: string;

  // Step 3: Languages
  languages: LanguageFormData[];

  // Step 4: Contents
  contents: ContentFormData[];
}

export const INITIAL_PHRASE: () => PhraseFormData = () => ({
  id: crypto.randomUUID(),
  text: "",
  translation: "",
  audioUrl: "",
});

export const INITIAL_LANGUAGE: () => LanguageFormData = () => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  phrases: [INITIAL_PHRASE()],
});

export const INITIAL_CONTENT: () => ContentFormData = () => ({
  id: crypto.randomUUID(),
  title: "",
  contentType: "IMAGE_UPLOAD",
  category: "OTHER",
  contentUrl: "",
});

export const INITIAL_FORM_DATA: (boundaryGeoJson: string) => WizardFormData = (
  boundaryGeoJson
) => ({
  name: "",
  description: "",
  flagUrl: "",
  boundaryGeoJson,
  languages: [INITIAL_LANGUAGE()],
  contents: [INITIAL_CONTENT()],
});

export function generateTempSlug(): string {
  return `temp-${Date.now()}`;
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/types.ts
git commit -m "feat: add wizard form types"
```

---

## Task 6: Create Basic Info Step Component

**Files:**
- Create: `src/components/nation/wizard/steps/basic-info-step.tsx`

**Step 1: Create step 1 component**

```typescript
"use client";

import { useState } from "react";
import {
  TextInput,
  Textarea,
  Stack,
  Text,
  Group,
  Image,
  ActionIcon,
  FileButton,
  Button,
  Progress,
} from "@mantine/core";
import { IconUpload, IconX, IconPhoto } from "@tabler/icons-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { getMediaUrl } from "@/lib/media-url";
import type { WizardFormData } from "../types";

interface BasicInfoStepProps {
  data: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  tempSlug: string;
  errors: Record<string, string>;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export function BasicInfoStep({
  data,
  onChange,
  tempSlug,
  errors,
}: BasicInfoStepProps) {
  const [flagPreview, setFlagPreview] = useState<string | null>(
    data.flagUrl ? getMediaUrl(data.flagUrl) : null
  );

  const { upload, uploading, progress, error: uploadError } = useFileUpload({
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
          <FileButton onChange={handleFileSelect} accept={ALLOWED_IMAGE_TYPES.join(",")}>
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
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/steps/basic-info-step.tsx
git commit -m "feat: add basic info step component"
```

---

## Task 7: Create Map Preview Step Component

**Files:**
- Create: `src/components/nation/wizard/steps/map-preview-step.tsx`

**Step 1: Create step 2 component with map preview**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { Stack, Text, Card } from "@mantine/core";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { WizardFormData } from "../types";

interface MapPreviewStepProps {
  data: WizardFormData;
}

export function MapPreviewStep({ data }: MapPreviewStepProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const boundary: GeoJSON.Feature<GeoJSON.MultiPolygon> | null = data.boundaryGeoJson
    ? JSON.parse(data.boundaryGeoJson)
    : null;

  const polygonCount = boundary?.geometry?.coordinates?.length ?? 0;

  useEffect(() => {
    if (!mapContainerRef.current || !boundary) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [0, 20],
      zoom: 2,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add the boundary source
      map.addSource("boundary", {
        type: "geojson",
        data: boundary,
      });

      // Add fill layer
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.3,
        },
      });

      // Add stroke layer
      map.addLayer({
        id: "boundary-stroke",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": "#2563eb",
          "line-width": 2,
        },
      });

      // Fit map to boundary
      const coords = boundary.geometry.coordinates.flat(2);
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);

      const bounds = new maplibregl.LngLatBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      );

      map.fitBounds(bounds, { padding: 40 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [boundary]);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Review your nation&apos;s territory boundaries below.
      </Text>

      <Card withBorder p={0} className="overflow-hidden">
        <div ref={mapContainerRef} style={{ height: 300, width: "100%" }} />
      </Card>

      <Text size="sm" c="dimmed">
        {polygonCount} polygon{polygonCount !== 1 ? "s" : ""} drawn
      </Text>
    </Stack>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/steps/map-preview-step.tsx
git commit -m "feat: add map preview step component"
```

---

## Task 8: Create Phrase Form Component

**Files:**
- Create: `src/components/nation/wizard/parts/phrase-form.tsx`

**Step 1: Create phrase entry component with audio upload**

```typescript
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
import { IconUpload, IconTrash, IconPlayerPlay, IconCheck } from "@tabler/icons-react";
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

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"];

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

  const { upload, uploading, progress, error: uploadError } = useFileUpload({
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
              <ActionIcon
                size="sm"
                color="green"
                variant="light"
              >
                <IconCheck size={14} />
              </ActionIcon>
            </Group>
          ) : (
            <FileButton onChange={handleFileSelect} accept={ALLOWED_AUDIO_TYPES.join(",")}>
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
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/parts/phrase-form.tsx
git commit -m "feat: add phrase form component with audio upload"
```

---

## Task 9: Create Language Form Component

**Files:**
- Create: `src/components/nation/wizard/parts/language-form.tsx`

**Step 1: Create language form with nested phrases**

```typescript
"use client";

import {
  TextInput,
  Textarea,
  Stack,
  Group,
  ActionIcon,
  Button,
  Text,
  Card,
  Accordion,
} from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { PhraseForm } from "./phrase-form";
import { INITIAL_PHRASE } from "../types";
import type { LanguageFormData, PhraseFormData } from "../types";

interface LanguageFormProps {
  language: LanguageFormData;
  onChange: (language: LanguageFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  tempSlug: string;
  index: number;
  errors?: Record<string, string>;
}

export function LanguageForm({
  language,
  onChange,
  onRemove,
  canRemove,
  tempSlug,
  index,
  errors = {},
}: LanguageFormProps) {
  const handlePhraseChange = (phraseIndex: number, phrase: PhraseFormData) => {
    const newPhrases = [...language.phrases];
    newPhrases[phraseIndex] = phrase;
    onChange({ ...language, phrases: newPhrases });
  };

  const handleAddPhrase = () => {
    onChange({
      ...language,
      phrases: [...language.phrases, INITIAL_PHRASE()],
    });
  };

  const handleRemovePhrase = (phraseIndex: number) => {
    if (language.phrases.length <= 1) return;
    const newPhrases = language.phrases.filter((_, i) => i !== phraseIndex);
    onChange({ ...language, phrases: newPhrases });
  };

  const errorPrefix = `languages.${index}`;

  return (
    <Accordion.Item value={language.id}>
      <Accordion.Control>
        <Group justify="space-between" pr="md">
          <Text fw={500}>
            {language.name || `Language ${index + 1}`}
          </Text>
          <Text size="sm" c="dimmed">
            {language.phrases.length} phrase{language.phrases.length !== 1 ? "s" : ""}
          </Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          <Group align="flex-start">
            <TextInput
              label="Language Name"
              placeholder="e.g., Swahili"
              required
              style={{ flex: 1 }}
              value={language.name}
              onChange={(e) => onChange({ ...language, name: e.target.value })}
              error={errors[`${errorPrefix}.name`]}
            />
            {canRemove && (
              <ActionIcon
                size="lg"
                color="red"
                variant="subtle"
                mt={24}
                onClick={onRemove}
              >
                <IconTrash size={18} />
              </ActionIcon>
            )}
          </Group>

          <Textarea
            label="Description"
            placeholder="Brief description of the language"
            required
            rows={2}
            value={language.description}
            onChange={(e) => onChange({ ...language, description: e.target.value })}
            error={errors[`${errorPrefix}.description`]}
          />

          <div>
            <Text size="sm" fw={500} mb="xs">
              Phrases (at least 1 required)
            </Text>
            <Stack gap="sm">
              {language.phrases.map((phrase, phraseIndex) => (
                <PhraseForm
                  key={phrase.id}
                  phrase={phrase}
                  onChange={(p) => handlePhraseChange(phraseIndex, p)}
                  onRemove={() => handleRemovePhrase(phraseIndex)}
                  canRemove={language.phrases.length > 1}
                  tempSlug={tempSlug}
                  index={phraseIndex}
                  errors={errors}
                />
              ))}
            </Stack>

            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlus size={14} />}
              mt="sm"
              onClick={handleAddPhrase}
            >
              Add Phrase
            </Button>
          </div>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/parts/language-form.tsx
git commit -m "feat: add language form component"
```

---

## Task 10: Create Languages Step Component

**Files:**
- Create: `src/components/nation/wizard/steps/languages-step.tsx`

**Step 1: Create step 3 component**

```typescript
"use client";

import { Stack, Button, Text, Accordion } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { LanguageForm } from "../parts/language-form";
import { INITIAL_LANGUAGE } from "../types";
import type { WizardFormData, LanguageFormData } from "../types";

interface LanguagesStepProps {
  data: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  tempSlug: string;
  errors: Record<string, string>;
}

export function LanguagesStep({
  data,
  onChange,
  tempSlug,
  errors,
}: LanguagesStepProps) {
  const handleLanguageChange = (index: number, language: LanguageFormData) => {
    const newLanguages = [...data.languages];
    newLanguages[index] = language;
    onChange({ languages: newLanguages });
  };

  const handleAddLanguage = () => {
    onChange({
      languages: [...data.languages, INITIAL_LANGUAGE()],
    });
  };

  const handleRemoveLanguage = (index: number) => {
    if (data.languages.length <= 1) return;
    const newLanguages = data.languages.filter((_, i) => i !== index);
    onChange({ languages: newLanguages });
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Add at least one language spoken in this nation, with example phrases.
      </Text>

      <Accordion variant="separated" defaultValue={data.languages[0]?.id}>
        {data.languages.map((language, index) => (
          <LanguageForm
            key={language.id}
            language={language}
            onChange={(lang) => handleLanguageChange(index, lang)}
            onRemove={() => handleRemoveLanguage(index)}
            canRemove={data.languages.length > 1}
            tempSlug={tempSlug}
            index={index}
            errors={errors}
          />
        ))}
      </Accordion>

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={handleAddLanguage}
      >
        Add Language
      </Button>

      {errors.languages && (
        <Text size="sm" c="red">
          {errors.languages}
        </Text>
      )}
    </Stack>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/steps/languages-step.tsx
git commit -m "feat: add languages step component"
```

---

## Task 11: Create Content Form Component

**Files:**
- Create: `src/components/nation/wizard/parts/content-form.tsx`

**Step 1: Create content entry component**

```typescript
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
import { IconUpload, IconTrash, IconCheck, IconBrandYoutube } from "@tabler/icons-react";
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

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/
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
      : null
  );

  const { upload, uploading, progress, error: uploadError } = useFileUpload({
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
  const youtubeEmbed = content.contentType === "VIDEO_YOUTUBE" && content.contentUrl
    ? getYouTubeEmbedUrl(content.contentUrl)
    : null;

  return (
    <Card withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            Content {index + 1}
          </Text>
          {canRemove && (
            <ActionIcon size="sm" color="red" variant="subtle" onClick={onRemove}>
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
            onChange({ ...content, category: value as ContentFormData["category"] })
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
          onChange={(value) => handleTypeChange(value as ContentFormData["contentType"])}
        >
          <Group mt="xs">
            <Radio value="IMAGE_UPLOAD" label="Image" />
            <Radio value="VIDEO_UPLOAD" label="Video" />
            <Radio value="VIDEO_YOUTUBE" label="YouTube" />
          </Group>
        </Radio.Group>

        {/* Upload input for IMAGE_UPLOAD or VIDEO_UPLOAD */}
        {(content.contentType === "IMAGE_UPLOAD" || content.contentType === "VIDEO_UPLOAD") && (
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
                    Upload {content.contentType === "IMAGE_UPLOAD" ? "Image" : "Video"}
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
                ? "PNG, JPG, WebP, GIF (max 10MB)"
                : "MP4, WebM (max 50MB)"}
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
              onChange={(e) => onChange({ ...content, contentUrl: e.target.value })}
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

        {errors[`${errorPrefix}.contentUrl`] && content.contentType !== "VIDEO_YOUTUBE" && (
          <Text size="xs" c="red">
            {errors[`${errorPrefix}.contentUrl`]}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/parts/content-form.tsx
git commit -m "feat: add content form component"
```

---

## Task 12: Create Contents Step Component

**Files:**
- Create: `src/components/nation/wizard/steps/contents-step.tsx`

**Step 1: Create step 4 component**

```typescript
"use client";

import { Stack, Button, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { ContentForm } from "../parts/content-form";
import { INITIAL_CONTENT } from "../types";
import type { WizardFormData, ContentFormData } from "../types";

interface ContentsStepProps {
  data: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  tempSlug: string;
  errors: Record<string, string>;
}

export function ContentsStep({
  data,
  onChange,
  tempSlug,
  errors,
}: ContentsStepProps) {
  const handleContentChange = (index: number, content: ContentFormData) => {
    const newContents = [...data.contents];
    newContents[index] = content;
    onChange({ contents: newContents });
  };

  const handleAddContent = () => {
    onChange({
      contents: [...data.contents, INITIAL_CONTENT()],
    });
  };

  const handleRemoveContent = (index: number) => {
    if (data.contents.length <= 1) return;
    const newContents = data.contents.filter((_, i) => i !== index);
    onChange({ contents: newContents });
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Add cultural content such as food, music, or other media.
      </Text>

      <Stack gap="sm">
        {data.contents.map((content, index) => (
          <ContentForm
            key={content.id}
            content={content}
            onChange={(c) => handleContentChange(index, c)}
            onRemove={() => handleRemoveContent(index)}
            canRemove={data.contents.length > 1}
            tempSlug={tempSlug}
            index={index}
            errors={errors}
          />
        ))}
      </Stack>

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={handleAddContent}
      >
        Add Content
      </Button>

      {errors.contents && (
        <Text size="sm" c="red">
          {errors.contents}
        </Text>
      )}
    </Stack>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/steps/contents-step.tsx
git commit -m "feat: add contents step component"
```

---

## Task 13: Create Review Step Component

**Files:**
- Create: `src/components/nation/wizard/steps/review-step.tsx`

**Step 1: Create step 5 review component**

```typescript
"use client";

import { Stack, Text, Card, Group, Image, Badge, Button, Divider } from "@mantine/core";
import { IconEdit, IconLanguage, IconPhoto, IconMap } from "@tabler/icons-react";
import { getMediaUrl } from "@/lib/media-url";
import type { WizardFormData } from "../types";

interface ReviewStepProps {
  data: WizardFormData;
  onEditStep: (step: number) => void;
}

export function ReviewStep({ data, onEditStep }: ReviewStepProps) {
  const boundary: GeoJSON.Feature<GeoJSON.MultiPolygon> | null = data.boundaryGeoJson
    ? JSON.parse(data.boundaryGeoJson)
    : null;
  const polygonCount = boundary?.geometry?.coordinates?.length ?? 0;

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Review your submission before submitting.
      </Text>

      {/* Basic Info */}
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Basic Info</Text>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEditStep(0)}
          >
            Edit
          </Button>
        </Group>
        <Stack gap="xs">
          <div>
            <Text size="xs" c="dimmed">Name</Text>
            <Text>{data.name}</Text>
          </div>
          {data.description && (
            <div>
              <Text size="xs" c="dimmed">Description</Text>
              <Text size="sm">{data.description}</Text>
            </div>
          )}
          {data.flagUrl && (
            <div>
              <Text size="xs" c="dimmed">Flag</Text>
              <Image
                src={getMediaUrl(data.flagUrl)}
                alt="Flag"
                w={60}
                h={40}
                fit="contain"
                radius="sm"
                className="border mt-1"
              />
            </div>
          )}
        </Stack>
      </Card>

      {/* Territory */}
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconMap size={16} />
            <Text fw={600}>Territory</Text>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEditStep(1)}
          >
            Edit
          </Button>
        </Group>
        <Text size="sm" c="dimmed">
          {polygonCount} polygon{polygonCount !== 1 ? "s" : ""} defined
        </Text>
      </Card>

      {/* Languages */}
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconLanguage size={16} />
            <Text fw={600}>Languages ({data.languages.length})</Text>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEditStep(2)}
          >
            Edit
          </Button>
        </Group>
        <Stack gap="xs">
          {data.languages.map((lang) => (
            <Group key={lang.id} gap="xs">
              <Text size="sm" fw={500}>{lang.name}</Text>
              <Badge size="xs" variant="light">
                {lang.phrases.length} phrase{lang.phrases.length !== 1 ? "s" : ""}
              </Badge>
            </Group>
          ))}
        </Stack>
      </Card>

      {/* Contents */}
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconPhoto size={16} />
            <Text fw={600}>Contents ({data.contents.length})</Text>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEditStep(3)}
          >
            Edit
          </Button>
        </Group>
        <Stack gap="xs">
          {data.contents.map((content) => (
            <Group key={content.id} gap="xs">
              <Text size="sm">{content.title}</Text>
              <Badge size="xs" variant="light">
                {content.category}
              </Badge>
              <Badge size="xs" variant="outline">
                {content.contentType === "VIDEO_YOUTUBE"
                  ? "YouTube"
                  : content.contentType === "VIDEO_UPLOAD"
                  ? "Video"
                  : "Image"}
              </Badge>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/steps/review-step.tsx
git commit -m "feat: add review step component"
```

---

## Task 14: Create Main Wizard Component

**Files:**
- Create: `src/components/nation/wizard/nation-submit-wizard.tsx`

**Step 1: Create the main wizard container**

```typescript
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Stepper,
  Button,
  Group,
  Alert,
  Stack,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { BasicInfoStep } from "./steps/basic-info-step";
import { MapPreviewStep } from "./steps/map-preview-step";
import { LanguagesStep } from "./steps/languages-step";
import { ContentsStep } from "./steps/contents-step";
import { ReviewStep } from "./steps/review-step";
import {
  INITIAL_FORM_DATA,
  generateTempSlug,
  type WizardFormData,
} from "./types";

interface NationSubmitWizardProps {
  opened: boolean;
  onClose: () => void;
  initialBoundary?: GeoJSON.Feature<GeoJSON.MultiPolygon> | null;
}

const STEP_LABELS = ["Basic Info", "Territory", "Languages", "Contents", "Review"];

export function NationSubmitWizard({
  opened,
  onClose,
  initialBoundary,
}: NationSubmitWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(() =>
    INITIAL_FORM_DATA("")
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Generate temp slug once per wizard session
  const tempSlug = useMemo(() => generateTempSlug(), [opened]);

  // Initialize form with boundary when modal opens
  useEffect(() => {
    if (opened && initialBoundary) {
      setFormData(INITIAL_FORM_DATA(JSON.stringify(initialBoundary)));
      setActiveStep(0);
      setErrors({});
      setSuccess(false);
      setSubmitError(null);
    }
  }, [opened, initialBoundary]);

  // Reset on close
  useEffect(() => {
    if (!opened) {
      setFormData(INITIAL_FORM_DATA(""));
      setActiveStep(0);
      setErrors({});
      setSuccess(false);
      setSubmitError(null);
    }
  }, [opened]);

  const handleChange = (data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Clear relevant errors when data changes
    const newErrors = { ...errors };
    Object.keys(data).forEach((key) => {
      Object.keys(newErrors).forEach((errKey) => {
        if (errKey.startsWith(key)) {
          delete newErrors[errKey];
        }
      });
    });
    setErrors(newErrors);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.name || formData.name.trim().length < 2) {
          newErrors.name = "Name must be at least 2 characters";
        }
        break;

      case 1: // Map Preview - always valid (boundary is pre-filled)
        break;

      case 2: // Languages
        if (formData.languages.length === 0) {
          newErrors.languages = "At least one language is required";
        }
        formData.languages.forEach((lang, langIndex) => {
          if (!lang.name.trim()) {
            newErrors[`languages.${langIndex}.name`] = "Required";
          }
          if (!lang.description.trim()) {
            newErrors[`languages.${langIndex}.description`] = "Required";
          }
          if (lang.phrases.length === 0) {
            newErrors[`languages.${langIndex}.phrases`] = "At least one phrase required";
          }
          lang.phrases.forEach((phrase, phraseIndex) => {
            if (!phrase.text.trim()) {
              newErrors[`languages.${langIndex}.phrases.${phraseIndex}.text`] = "Required";
            }
            if (!phrase.translation.trim()) {
              newErrors[`languages.${langIndex}.phrases.${phraseIndex}.translation`] = "Required";
            }
            if (!phrase.audioUrl) {
              newErrors[`languages.${langIndex}.phrases.${phraseIndex}.audioUrl`] = "Audio required";
            }
          });
        });
        break;

      case 3: // Contents
        if (formData.contents.length === 0) {
          newErrors.contents = "At least one content item is required";
        }
        formData.contents.forEach((content, contentIndex) => {
          if (!content.title.trim()) {
            newErrors[`contents.${contentIndex}.title`] = "Required";
          }
          if (!content.contentUrl) {
            newErrors[`contents.${contentIndex}.contentUrl`] =
              content.contentType === "VIDEO_YOUTUBE"
                ? "YouTube URL required"
                : "File required";
          }
          // Validate YouTube URL format
          if (content.contentType === "VIDEO_YOUTUBE" && content.contentUrl) {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/;
            if (!youtubeRegex.test(content.contentUrl)) {
              newErrors[`contents.${contentIndex}.contentUrl`] = "Invalid YouTube URL";
            }
          }
        });
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStepClick = (step: number) => {
    // Only allow going back, or going to steps that are already validated
    if (step < activeStep) {
      setActiveStep(step);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare data for API
      const submitData = {
        name: formData.name,
        description: formData.description || undefined,
        flagUrl: formData.flagUrl || undefined,
        boundaryGeoJson: formData.boundaryGeoJson,
        languages: formData.languages.map((lang) => ({
          name: lang.name,
          description: lang.description,
          phrases: lang.phrases.map((phrase) => ({
            text: phrase.text,
            translation: phrase.translation,
            audioUrl: phrase.audioUrl,
          })),
        })),
        contents: formData.contents.map((content) => ({
          title: content.title,
          contentType: content.contentType,
          category: content.category,
          contentUrl: content.contentUrl,
        })),
      };

      const response = await fetch("/api/nations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit nation");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Submit a New Nation"
      size="lg"
      closeOnClickOutside={false}
    >
      {success ? (
        <Alert icon={<IconCheck size={16} />} color="green" title="Success!">
          Your nation has been submitted and is pending review by our moderators.
        </Alert>
      ) : (
        <Stack gap="lg">
          <Stepper active={activeStep} onStepClick={handleStepClick} size="sm">
            {STEP_LABELS.map((label, index) => (
              <Stepper.Step key={label} label={label} />
            ))}
          </Stepper>

          {submitError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
              {submitError}
            </Alert>
          )}

          <div style={{ minHeight: 300 }}>
            {activeStep === 0 && (
              <BasicInfoStep
                data={formData}
                onChange={handleChange}
                tempSlug={tempSlug}
                errors={errors}
              />
            )}
            {activeStep === 1 && <MapPreviewStep data={formData} />}
            {activeStep === 2 && (
              <LanguagesStep
                data={formData}
                onChange={handleChange}
                tempSlug={tempSlug}
                errors={errors}
              />
            )}
            {activeStep === 3 && (
              <ContentsStep
                data={formData}
                onChange={handleChange}
                tempSlug={tempSlug}
                errors={errors}
              />
            )}
            {activeStep === 4 && (
              <ReviewStep data={formData} onEditStep={setActiveStep} />
            )}
          </div>

          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>

            {activeStep < 4 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                Submit Nation
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/nation-submit-wizard.tsx
git commit -m "feat: add main wizard component"
```

---

## Task 15: Create Index Export

**Files:**
- Create: `src/components/nation/wizard/index.ts`

**Step 1: Create barrel export**

```typescript
export { NationSubmitWizard } from "./nation-submit-wizard";
export type {
  WizardFormData,
  LanguageFormData,
  PhraseFormData,
  ContentFormData,
} from "./types";
```

**Step 2: Commit**

```bash
git add src/components/nation/wizard/index.ts
git commit -m "feat: add wizard barrel export"
```

---

## Task 16: Update Main Page to Use Wizard

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace NationSubmitForm with NationSubmitWizard**

```typescript
"use client";

import { useState, useCallback } from "react";
import { WorldMap } from "@/components/map/world-map";
import { NationModal } from "@/components/nation/nation-modal";
import { NationSelectionPopup } from "@/components/map/nation-selection-popup";
import { NationSubmitWizard } from "@/components/nation/wizard";
import { MainPageControls } from "@/components/controls/main-page-controls";
import { AddNationButton } from "@/components/controls/add-nation-button";
import { PolygonDraw } from "@/components/map/polygon-draw";
import { useMapStore } from "@/stores/map-store";
import type { LngLat } from "maplibre-gl";

interface NationAtPoint {
  id: string;
  name: string;
  slug: string;
  flagUrl: string | null;
}

export default function HomePage() {
  const [selectedNationSlug, setSelectedNationSlug] = useState<string | null>(
    null
  );
  const [submitFormOpen, setSubmitFormOpen] = useState(false);
  const [overlappingNations, setOverlappingNations] = useState<
    NationAtPoint[] | null
  >(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawnBoundary, setDrawnBoundary] =
    useState<GeoJSON.Feature<GeoJSON.MultiPolygon> | null>(null);

  const { setIsDrawingMode, isDrawingMode, clearDrawnPolygons } = useMapStore();

  const handleNationClick = useCallback((slug: string) => {
    setSelectedNationSlug(slug);
    setOverlappingNations(null);
    setPopupPosition(null);
  }, []);

  const handleMultipleNations = useCallback(
    (nations: NationAtPoint[], _lngLat: LngLat) => {
      setOverlappingNations(nations);
      setPopupPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    },
    []
  );

  const handleClosePopup = useCallback(() => {
    setOverlappingNations(null);
    setPopupPosition(null);
  }, []);

  const handleStartDrawing = useCallback(() => {
    setIsDrawingMode(true);
  }, [setIsDrawingMode]);

  const handlePolygonComplete = useCallback(
    (multiPolygon: GeoJSON.Feature<GeoJSON.MultiPolygon>) => {
      setDrawnBoundary(multiPolygon);
      setSubmitFormOpen(true);
    },
    []
  );

  const handlePolygonCancel = useCallback(() => {
    setDrawnBoundary(null);
  }, []);

  const handleSubmitFormClose = useCallback(() => {
    setSubmitFormOpen(false);
    setDrawnBoundary(null);
    clearDrawnPolygons();
  }, [clearDrawnPolygons]);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Full-screen globe map */}
      <WorldMap
        onNationClick={handleNationClick}
        onMultipleNationsAtPoint={handleMultipleNations}
      />

      {/* Right-side controls */}
      <MainPageControls />

      {/* Bottom center "+" button to add nation */}
      {!isDrawingMode && (
        <AddNationButton onStartDrawing={handleStartDrawing} />
      )}

      {/* Polygon drawing mode UI */}
      <PolygonDraw
        onComplete={handlePolygonComplete}
        onCancel={handlePolygonCancel}
      />

      {/* Overlapping nations selection popup */}
      {overlappingNations && popupPosition && (
        <NationSelectionPopup
          nations={overlappingNations}
          position={popupPosition}
          onSelect={handleNationClick}
          onClose={handleClosePopup}
        />
      )}

      {/* Nation details modal */}
      <NationModal
        slug={selectedNationSlug}
        onClose={() => setSelectedNationSlug(null)}
      />

      {/* Nation submission wizard with pre-filled boundary */}
      <NationSubmitWizard
        opened={submitFormOpen}
        onClose={handleSubmitFormClose}
        initialBoundary={drawnBoundary}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace submit form with wizard"
```

---

## Task 17: Final Testing & Cleanup

**Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No errors (or only warnings)

**Step 3: Manual Testing Checklist**

1. Click "Add a new nation" button
2. Draw polygons on the map
3. Click "Finish" to open wizard
4. **Step 1**: Enter name, description, upload flag (optional)
5. **Step 2**: Verify map shows drawn polygons
6. **Step 3**: Add language with name, description, and phrase (with audio)
7. **Step 4**: Add content with title, category, type, and upload/URL
8. **Step 5**: Review all data, use "Edit" buttons to go back
9. Click "Submit Nation" and verify success

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete nation submission wizard implementation"
```

---

## Summary

This plan creates a 5-step wizard for nation submission:

1. **Basic Info** - Name, description, flag upload
2. **Territory** - Map preview of drawn polygons
3. **Languages** - Add languages with phrases and audio
4. **Contents** - Add cultural content (images, videos, YouTube)
5. **Review** - Summary with edit buttons

**Files Created:**
- `src/hooks/use-file-upload.ts`
- `src/components/nation/wizard/types.ts`
- `src/components/nation/wizard/index.ts`
- `src/components/nation/wizard/nation-submit-wizard.tsx`
- `src/components/nation/wizard/steps/basic-info-step.tsx`
- `src/components/nation/wizard/steps/map-preview-step.tsx`
- `src/components/nation/wizard/steps/languages-step.tsx`
- `src/components/nation/wizard/steps/contents-step.tsx`
- `src/components/nation/wizard/steps/review-step.tsx`
- `src/components/nation/wizard/parts/phrase-form.tsx`
- `src/components/nation/wizard/parts/language-form.tsx`
- `src/components/nation/wizard/parts/content-form.tsx`

**Files Modified:**
- `src/lib/validations/nation.ts`
- `src/app/api/nations/route.ts`
- `src/app/page.tsx`

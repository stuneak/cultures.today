# Cultures UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 10 UI/UX improvements including modal styling, language schema changes, wizard step reordering, media handling, and carousel navigation.

**Architecture:** Frontend-first changes with Mantine components, one Prisma schema migration for removing language description, and media processing updates for video/image handling.

**Tech Stack:** Next.js 14 (App Router), Mantine UI, Prisma ORM, PostgreSQL, MinIO storage

---

## Task 1: Add Modal Border Radius

**Files:**
- Modify: `src/components/nation/nation-modal.tsx:47-75`
- Modify: `src/components/nation/wizard/nation-submit-wizard.tsx:233-241`
- Modify: `src/components/nation/nation-submit-form.tsx:95-101`
- Modify: `src/components/admin/nation-review-modal.tsx:64-70`

**Step 1: Update nation-modal.tsx**

Add `radius="md"` prop to the Modal component:

```tsx
// In src/components/nation/nation-modal.tsx, line 48
<Modal
  opened={!!slug}
  onClose={onClose}
  size="xl"
  radius="md"
  title={
```

**Step 2: Update nation-submit-wizard.tsx**

Change `radius="sm"` to `radius="md"`:

```tsx
// In src/components/nation/wizard/nation-submit-wizard.tsx, line 234
<Modal
  opened={opened}
  onClose={onClose}
  title="Submit a new nation"
  size="lg"
  radius="md"
  closeOnClickOutside={false}
>
```

**Step 3: Update nation-submit-form.tsx**

Add `radius="md"` prop:

```tsx
// In src/components/nation/nation-submit-form.tsx, line 96
<Modal
  opened={opened}
  onClose={onClose}
  title="Submit a New Nation"
  size="md"
  radius="md"
>
```

**Step 4: Update nation-review-modal.tsx**

Add `radius="md"` prop:

```tsx
// In src/components/admin/nation-review-modal.tsx, line 65
<Modal
  opened={!!nationId}
  onClose={onClose}
  title="Review Nation Submission"
  size="lg"
  radius="md"
>
```

**Step 5: Verify visually**

Run: `npm run dev`
Expected: All modals now have rounded corners matching `var(--mantine-radius-md)`

**Step 6: Commit**

```bash
git add src/components/nation/nation-modal.tsx src/components/nation/wizard/nation-submit-wizard.tsx src/components/nation/nation-submit-form.tsx src/components/admin/nation-review-modal.tsx
git commit -m "style: add radius-md to all modals"
```

---

## Task 2: Remove Language Description from Backend

**Files:**
- Modify: `prisma/schema.prisma:56-67`
- Create: `prisma/migrations/YYYYMMDD_remove_language_description/migration.sql`
- Modify: `src/lib/validations/nation.ts:27-32`
- Modify: `src/app/api/nations/route.ts:107-122`

**Step 1: Update Prisma schema**

Remove description field from Language model:

```prisma
// In prisma/schema.prisma, replace lines 56-67
model Language {
  id       String @id @default(cuid())
  name     String

  nationId String @map("nation_id")
  nation   Nation @relation(fields: [nationId], references: [id], onDelete: Cascade)

  phrases Phrase[]

  @@map("languages")
}
```

**Step 2: Create and run migration**

Run: `npx prisma migrate dev --name remove_language_description`
Expected: Migration creates SQL to drop the `description` column from `languages` table

**Step 3: Update validation schema**

Remove description from languageSchema:

```typescript
// In src/lib/validations/nation.ts, replace lines 27-32
export const languageSchema = z.object({
  name: z.string().min(1, "Language name is required"),
  phrases: z.array(phraseSchema).min(1, "At least one phrase is required"),
});
```

**Step 4: Update API route**

Remove description from language creation:

```typescript
// In src/app/api/nations/route.ts, replace lines 107-122
// Create languages with phrases
for (const lang of data.languages) {
  await tx.language.create({
    data: {
      name: lang.name,
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
```

**Step 5: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: Prisma client updated without description field

**Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/validations/nation.ts src/app/api/nations/route.ts
git commit -m "feat: remove description field from Language model"
```

---

## Task 3: Remove Language Description from Frontend

**Files:**
- Modify: `src/components/nation/wizard/types.ts:8-13`
- Modify: `src/components/nation/wizard/parts/language-form.tsx:93-104`
- Modify: `src/components/nation/wizard/nation-submit-wizard.tsx:105-111`
- Modify: `src/components/nation/sections/languages-section.tsx:12-18,41-44`

**Step 1: Update types**

Remove description from LanguageFormData:

```typescript
// In src/components/nation/wizard/types.ts, replace lines 8-13
export interface LanguageFormData {
  id: string; // local ID for React keys
  name: string;
  phrases: PhraseFormData[];
}
```

**Step 2: Update INITIAL_LANGUAGE**

Remove description from initial language:

```typescript
// In src/components/nation/wizard/types.ts, replace lines 46-51
export const INITIAL_LANGUAGE: () => LanguageFormData = () => ({
  id: crypto.randomUUID(),
  name: "",
  phrases: [INITIAL_PHRASE()],
});
```

**Step 3: Remove description field from language-form.tsx**

Remove the Textarea for description:

```tsx
// In src/components/nation/wizard/parts/language-form.tsx
// Delete lines 93-104 (the Textarea component for description)
```

**Step 4: Update wizard validation**

Remove description validation:

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx, lines 105-111
// Change:
formData.languages.forEach((lang, langIndex) => {
  if (!lang.name.trim()) {
    newErrors[`languages.${langIndex}.name`] = "Required";
  }
  // Remove the description validation (lines 109-111)
  if (lang.phrases.length === 0) {
    newErrors[`languages.${langIndex}.phrases`] =
      "At least one phrase required";
  }
```

**Step 5: Update handleSubmit in wizard**

Remove description from submit data:

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx, lines 194-202
languages: formData.languages.map((lang) => ({
  name: lang.name,
  phrases: lang.phrases.map((phrase) => ({
    text: phrase.text,
    translation: phrase.translation,
    audioUrl: phrase.audioUrl,
  })),
})),
```

**Step 6: Update languages-section.tsx interface**

Remove description from interface:

```typescript
// In src/components/nation/sections/languages-section.tsx, replace lines 12-18
interface Language {
  id: string;
  name: string;
  phrases: Phrase[];
}
```

**Step 7: Remove description display**

Remove lines 42-44 from languages-section.tsx (the Text component showing description)

**Step 8: Verify the form works**

Run: `npm run dev`
Expected: Language form no longer shows description field

**Step 9: Commit**

```bash
git add src/components/nation/wizard/types.ts src/components/nation/wizard/parts/language-form.tsx src/components/nation/wizard/nation-submit-wizard.tsx src/components/nation/sections/languages-section.tsx
git commit -m "feat: remove language description from frontend"
```

---

## Task 4: Add Nation Description Block to Modal

**Files:**
- Modify: `src/components/nation/nation-modal.tsx:89-96`

**Step 1: Update description display in nation-modal.tsx**

Replace the simple dimmed text with a proper block:

```tsx
// In src/components/nation/nation-modal.tsx, replace lines 91-96
{/* Description Block */}
{nation.description && (
  <Card withBorder p="md" radius="md">
    <Text size="sm" fw={500} mb="xs" c="dimmed">
      About
    </Text>
    <Text size="sm">{nation.description}</Text>
  </Card>
)}
```

**Step 2: Import Card if not already imported**

```tsx
// In src/components/nation/nation-modal.tsx, update line 4
import { Modal, Text, Skeleton, Group, Title, Divider, Card } from "@mantine/core";
```

**Step 3: Verify visually**

Run: `npm run dev`
Expected: Nation description appears in a card block with "About" label

**Step 4: Commit**

```bash
git add src/components/nation/nation-modal.tsx
git commit -m "feat: add styled card block for nation description"
```

---

## Task 5: Move Territory Step to Review (Last Step)

**Files:**
- Modify: `src/components/nation/wizard/nation-submit-wizard.tsx`
- Modify: `src/components/nation/wizard/steps/review-step.tsx`

**Step 1: Update STEP_LABELS**

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx, replace lines 23-29
const STEP_LABELS = [
  "Basic Info",
  "Languages",
  "Contents",
  "Review",  // Territory info will be shown here
];
```

**Step 2: Update step content rendering**

```tsx
// In src/components/nation/wizard/nation-submit-wizard.tsx, replace lines 265-294
<div style={{ minHeight: 300 }}>
  {activeStep === 0 && (
    <BasicInfoStep
      data={formData}
      onChange={handleChange}
      tempSlug={tempSlug}
      errors={errors}
    />
  )}
  {activeStep === 1 && (
    <LanguagesStep
      data={formData}
      onChange={handleChange}
      tempSlug={tempSlug}
      errors={errors}
    />
  )}
  {activeStep === 2 && (
    <ContentsStep
      data={formData}
      onChange={handleChange}
      tempSlug={tempSlug}
      errors={errors}
    />
  )}
  {activeStep === 3 && (
    <ReviewStep data={formData} onEditStep={setActiveStep} />
  )}
</div>
```

**Step 3: Update handleNext**

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx, line 168
setActiveStep((prev) => Math.min(prev + 1, 3)); // Changed from 4 to 3
```

**Step 4: Update submit button condition**

```tsx
// In src/components/nation/wizard/nation-submit-wizard.tsx, lines 305-310
{activeStep < 3 ? (
  <Button onClick={handleNext}>Next</Button>
) : (
  <Button onClick={handleSubmit} loading={submitting}>
    Submit Nation
  </Button>
)}
```

**Step 5: Update validateStep switch cases**

Renumber cases:
- case 0: Basic Info (unchanged)
- case 1: Languages (was case 2)
- case 2: Contents (was case 3)
- Remove case 1 (Territory - was always valid anyway)

**Step 6: Update review step edit callbacks**

```tsx
// In src/components/nation/wizard/steps/review-step.tsx
// Update onEditStep calls:
// - Basic Info: onEditStep(0) - unchanged
// - Languages: onEditStep(1) - was (2)
// - Contents: onEditStep(2) - was (3)
// Remove Territory section or make it read-only display
```

**Step 7: Remove MapPreviewStep import from wizard**

Remove line 7: `import { MapPreviewStep } from "./steps/map-preview-step";`

**Step 8: Add map preview to ReviewStep**

Update ReviewStep to include the territory preview inline (using MapPreviewStep component or just showing polygon count)

**Step 9: Verify wizard flow**

Run: `npm run dev`
Expected: Wizard has 4 steps: Basic Info → Languages → Contents → Review (with territory info)

**Step 10: Commit**

```bash
git add src/components/nation/wizard/nation-submit-wizard.tsx src/components/nation/wizard/steps/review-step.tsx
git commit -m "feat: move territory step to review step"
```

---

## Task 6: Enable Backward/Forward Step Navigation

**Files:**
- Modify: `src/components/nation/wizard/nation-submit-wizard.tsx:176-181`

**Step 1: Add state to track highest completed step**

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx, add after line 42
const [highestCompletedStep, setHighestCompletedStep] = useState(-1);
```

**Step 2: Update handleNext to track progress**

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx, replace lines 166-170
const handleNext = () => {
  if (validateStep(activeStep)) {
    setHighestCompletedStep((prev) => Math.max(prev, activeStep));
    setActiveStep((prev) => Math.min(prev + 1, 3));
  }
};
```

**Step 3: Update handleStepClick for bidirectional navigation**

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx, replace lines 176-181
const handleStepClick = (step: number) => {
  // Allow going back to any previous step
  if (step < activeStep) {
    setActiveStep(step);
    return;
  }
  // Allow going forward only if step was previously completed
  if (step <= highestCompletedStep + 1 && step <= activeStep + 1) {
    // Validate current step before moving forward
    if (validateStep(activeStep)) {
      setHighestCompletedStep((prev) => Math.max(prev, activeStep));
      setActiveStep(step);
    }
  }
};
```

**Step 4: Reset highestCompletedStep on modal open/close**

```typescript
// In src/components/nation/wizard/nation-submit-wizard.tsx
// In the useEffect for opened state (around line 53-61), add:
setHighestCompletedStep(-1);

// In the useEffect for !opened (around line 64-72), add:
setHighestCompletedStep(-1);
```

**Step 5: Verify navigation**

Run: `npm run dev`
Expected:
- Can always go back to previous steps
- Can only go forward to steps that were previously visited
- Clicking forward step validates current step first

**Step 6: Commit**

```bash
git add src/components/nation/wizard/nation-submit-wizard.tsx
git commit -m "feat: enable bidirectional wizard step navigation"
```

---

## Task 7: Video Processing - 16:9 at 720p

**Files:**
- Modify: `src/app/api/upload/route.ts`
- Create: `src/lib/video-processor.ts`
- Modify: `package.json` (add ffmpeg dependency if needed)

**Note:** This task requires server-side video processing with ffmpeg. If ffmpeg is not available, we can either:
- Option A: Process client-side before upload using browser APIs
- Option B: Add a separate video processing endpoint
- Option C: Store original and process asynchronously

**Step 1: Install ffmpeg bindings (if using server-side)**

Run: `npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg`

**Step 2: Create video processor utility**

```typescript
// Create src/lib/video-processor.ts
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { Readable } from "stream";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function processVideo(
  inputBuffer: Buffer,
  inputFilename: string
): Promise<Buffer> {
  const tempInput = join(tmpdir(), `input-${randomUUID()}.${inputFilename.split('.').pop()}`);
  const tempOutput = join(tmpdir(), `output-${randomUUID()}.mp4`);

  try {
    await writeFile(tempInput, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInput)
        .outputOptions([
          "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "128k",
        ])
        .output(tempOutput)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const outputBuffer = await readFile(tempOutput);
    return outputBuffer;
  } finally {
    await unlink(tempInput).catch(() => {});
    await unlink(tempOutput).catch(() => {});
  }
}
```

**Step 3: Update upload route to process videos**

```typescript
// In src/app/api/upload/route.ts
import { processVideo } from "@/lib/video-processor";

// In the POST handler, after getting the file:
let fileToUpload: File | Buffer = file;

if (category === "content" && file.type.startsWith("video/")) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const processedBuffer = await processVideo(buffer, file.name);
  fileToUpload = new File([processedBuffer], file.name.replace(/\.\w+$/, '.mp4'), {
    type: "video/mp4",
  });
}
```

**Step 4: Verify video processing**

Run: `npm run dev`
Upload a video and verify it's converted to 1280x720

**Step 5: Commit**

```bash
git add src/lib/video-processor.ts src/app/api/upload/route.ts package.json package-lock.json
git commit -m "feat: process uploaded videos to 16:9 720p"
```

---

## Task 8: Flag Image Handling - Fit in 1024x720 Box

**Files:**
- Modify: `src/app/api/upload/route.ts`
- Create: `src/lib/image-processor.ts`
- Modify: `src/components/nation/nation-modal.tsx` (flag display)

**Step 1: Install sharp for image processing**

Run: `npm install sharp`

**Step 2: Create image processor utility**

```typescript
// Create src/lib/image-processor.ts
import sharp from "sharp";

export async function processFlag(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(1024, 720, {
      fit: "inside",  // Never crop, fit inside box
      withoutEnlargement: true,  // Don't upscale small images
    })
    .png()  // Output as PNG to preserve transparency
    .toBuffer();
}
```

**Step 3: Update upload route for flag processing**

```typescript
// In src/app/api/upload/route.ts
import { processFlag } from "@/lib/image-processor";

// In the POST handler:
if (category === "flags" && file.type.startsWith("image/")) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const processedBuffer = await processFlag(buffer);
  fileToUpload = new File([processedBuffer], file.name.replace(/\.\w+$/, '.png'), {
    type: "image/png",
  });
}
```

**Step 4: Update flag display in nation-modal.tsx**

```tsx
// In src/components/nation/nation-modal.tsx, replace lines 57-68
{nation.flagUrl && (
  <div className="relative w-12 h-8">
    <Image
      src={getMediaUrl(nation.flagUrl)}
      alt={`${nation.name} flag`}
      fill
      className="object-contain rounded"
      unoptimized={getMediaUrl(nation.flagUrl).includes("localhost")}
    />
  </div>
)}
```

**Step 5: Verify flag handling**

Run: `npm run dev`
Upload flags with various aspect ratios and verify they display correctly

**Step 6: Commit**

```bash
git add src/lib/image-processor.ts src/app/api/upload/route.ts src/components/nation/nation-modal.tsx package.json package-lock.json
git commit -m "feat: process flag images to fit 1024x720 with contain display"
```

---

## Task 9: Add 100MB Image Size Limit

**Files:**
- Modify: `src/hooks/use-file-upload.ts`
- Modify: `src/components/nation/wizard/parts/content-form.tsx:219-223`
- Modify: `src/app/api/upload/route.ts`

**Step 1: Add file size validation in hook**

```typescript
// In src/hooks/use-file-upload.ts, add constant
const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB

// In the upload function, add validation:
if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
  setError("Image must be less than 100MB");
  return;
}
```

**Step 2: Update UI text in content-form.tsx**

```tsx
// In src/components/nation/wizard/parts/content-form.tsx, line 221
{content.contentType === "IMAGE_UPLOAD"
  ? "PNG, JPG, WebP, GIF (max 100MB)"
  : "MP4, WebM (max 50MB)"}
```

**Step 3: Add server-side validation in upload route**

```typescript
// In src/app/api/upload/route.ts
const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB

// After getting file:
if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
  return NextResponse.json(
    { error: "Image must be less than 100MB" },
    { status: 400 }
  );
}
```

**Step 4: Verify size limit**

Run: `npm run dev`
Try to upload an image >100MB and verify error is shown

**Step 5: Commit**

```bash
git add src/hooks/use-file-upload.ts src/components/nation/wizard/parts/content-form.tsx src/app/api/upload/route.ts
git commit -m "feat: add 100MB image size limit"
```

---

## Task 10: Simplify Audio Recording UI

**Files:**
- Modify: `src/components/nation/wizard/parts/phrase-form.tsx:203-230`
- Modify: `src/hooks/use-audio-recorder.ts`

**Step 1: Update the preview state handling**

Auto-save after recording stops:

```typescript
// In src/hooks/use-audio-recorder.ts
// Modify the stop function to auto-transition to saved state
// Or expose an autoSave option
```

**Step 2: Remove Save button from preview state**

```tsx
// In src/components/nation/wizard/parts/phrase-form.tsx, replace lines 203-230
{/* PREVIEW state - auto-upload, only show re-record */}
{recorderState === "preview" && previewUrl && (
  <Stack gap="xs">
    <Group gap="xs">
      <audio controls style={{ height: 32 }}>
        <source src={previewUrl} type="audio/webm" />
      </audio>
      {uploading && <Progress value={progress} size="xs" w={100} />}
    </Group>
    <Button
      size="xs"
      variant="subtle"
      leftSection={<IconRefresh size={14} />}
      onClick={handleReRecord}
      disabled={uploading}
    >
      Re-record
    </Button>
  </Stack>
)}
```

**Step 3: Auto-upload when recording stops**

```typescript
// In src/components/nation/wizard/parts/phrase-form.tsx
// Add useEffect to auto-save when preview state is entered:
useEffect(() => {
  if (recorderState === "preview" && audioBlob && !phrase.audioUrl) {
    handleSave();
  }
}, [recorderState, audioBlob]);
```

**Step 4: Simplify SAVED state**

```tsx
// In src/components/nation/wizard/parts/phrase-form.tsx, replace lines 232-257
{/* SAVED state */}
{(recorderState === "saved" || savedAudioUrl) &&
  recorderState !== "recording" &&
  recorderState !== "preview" && (
    <Stack gap="xs">
      <Group gap="xs">
        <audio controls style={{ height: 32 }}>
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
```

**Step 5: Verify audio flow**

Run: `npm run dev`
Record audio and verify it auto-saves without needing to click Save

**Step 6: Commit**

```bash
git add src/components/nation/wizard/parts/phrase-form.tsx src/hooks/use-audio-recorder.ts
git commit -m "feat: auto-save audio recordings, simplify UI"
```

---

## Task 11: Replace Tabs with Carousel in Nation Modal

**Files:**
- Modify: `src/components/nation/sections/content-section.tsx`
- Modify: `package.json` (add embla carousel if not present)

**Step 1: Install Embla Carousel for Mantine**

Run: `npm install @mantine/carousel embla-carousel-react`

**Step 2: Import carousel styles**

```tsx
// In src/components/nation/sections/content-section.tsx
import { Carousel } from "@mantine/carousel";
import "@mantine/carousel/styles.css";
```

**Step 3: Replace Tabs with Carousel**

```tsx
// In src/components/nation/sections/content-section.tsx, replace lines 79-132
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

  const categories = [
    { label: "All", icon: null, items: contents },
    { label: "Food", icon: <IconToolsKitchen2 size={14} />, items: foodContent },
    { label: "Music", icon: <IconMusic size={14} />, items: musicContent },
    { label: "Other", icon: <IconPhoto size={14} />, items: otherContent },
  ].filter((cat) => cat.items.length > 0);

  return (
    <Carousel
      slideSize="100%"
      slideGap="md"
      loop
      withIndicators
      withControls
      styles={{
        control: {
          '&[data-inactive]': {
            opacity: 0,
            cursor: 'default',
          },
        },
      }}
    >
      {categories.map((category) => (
        <Carousel.Slide key={category.label}>
          <div>
            <Group gap="xs" mb="md">
              {category.icon}
              <Text fw={500}>
                {category.label} ({category.items.length})
              </Text>
            </Group>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </Carousel.Slide>
      ))}
    </Carousel>
  );
}
```

**Step 4: Add carousel styles to provider if needed**

```tsx
// In src/components/providers/mantine-provider.tsx, add import
import "@mantine/carousel/styles.css";
```

**Step 5: Verify carousel works**

Run: `npm run dev`
Expected: Content categories displayed as swipeable carousel slides

**Step 6: Commit**

```bash
git add src/components/nation/sections/content-section.tsx src/components/providers/mantine-provider.tsx package.json package-lock.json
git commit -m "feat: replace content tabs with swipeable carousel"
```

---

## Summary of Changes

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Modal border radius | 4 modal components |
| 2 | Remove Language.description (backend) | schema, validation, API |
| 3 | Remove Language.description (frontend) | types, forms, display |
| 4 | Nation description card block | nation-modal.tsx |
| 5 | Move Territory to Review step | wizard, review-step |
| 6 | Bidirectional step navigation | wizard |
| 7 | Video 16:9 720p processing | upload route, new utility |
| 8 | Flag image processing | upload route, new utility |
| 9 | 100MB image limit | upload hook, route, form |
| 10 | Auto-save audio recordings | phrase-form, audio hook |
| 11 | Carousel instead of tabs | content-section |

---

## Execution Notes

- Tasks 1-4 and 9-11 are frontend-only and can be done without database migration
- Task 2 requires Prisma migration - do this first to avoid schema conflicts
- Tasks 7-8 require ffmpeg/sharp dependencies - check server compatibility
- Test each task individually before committing

import { z } from "zod";

export const cultureQuerySchema = z.object({
  search: z.string().optional(),
  state: z.enum(["approved", "pending"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// YouTube URL validation schema
export const youtubeUrlSchema = z.string().refine(
  (url) => {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=-]*)*$/;
    return youtubeRegex.test(url);
  },
  { message: "Invalid YouTube URL" },
);

// Phrase schema for language phrases
export const phraseSchema = z.object({
  text: z.string().min(1, "Phrase text is required").max(100, "Phrase must be no longer than 100 characters"),
  translation: z.string().min(1, "Translation is required").max(100, "Translation must be no longer than 100 characters"),
  audioUrl: z.string().optional(),
});

// Language schema with nested phrases
export const languageSchema = z.object({
  name: z.string().min(1, "Language name is required").max(100, "Language name must be no longer than 100 characters"),
  phrases: z.array(phraseSchema).min(1, "At least one phrase is required"),
});

// Content schema for culture content items
export const contentSchema = z.object({
  title: z.string().min(1, "Content title is required").max(300, "Content title must be no longer than 300 characters"),
  contentType: z.enum(["UPLOAD", "VIDEO_YOUTUBE"]),
  contentUrl: z.string().min(1, "Content URL is required"),
});

export const cultureSubmitSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z
    .string()
    .min(1, "Description is required")
    .max(800, "Description must be no longer than 800 characters"),
  flagUrl: z.string().optional(),
  boundaryGeoJson: z.string().min(1, "Boundary is required"), // GeoJSON string with MultiPolygon geometry
  languages: z
    .array(languageSchema)
    .min(1, "At least one language is required"),
  contents: z
    .array(contentSchema)
    .min(1, "At least one content item is required"),
});

export const cultureUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  flagUrl: z.string().optional(),
  boundaryGeoJson: z.string().optional(),
  state: z.enum(["approved", "pending"]).optional(),
});

export type CultureQuery = z.infer<typeof cultureQuerySchema>;
export type CultureSubmit = z.infer<typeof cultureSubmitSchema>;
export type CultureUpdate = z.infer<typeof cultureUpdateSchema>;
export type LanguageInput = z.infer<typeof languageSchema>;
export type PhraseInput = z.infer<typeof phraseSchema>;
export type ContentInput = z.infer<typeof contentSchema>;

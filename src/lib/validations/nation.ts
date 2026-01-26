import { z } from "zod";

export const nationQuerySchema = z.object({
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
  { message: "Invalid YouTube URL" }
);

// Phrase schema for language phrases
export const phraseSchema = z.object({
  text: z.string().min(1, "Phrase text is required"),
  translation: z.string().min(1, "Translation is required"),
  audioUrl: z.string().min(1, "Audio URL is required"),
});

// Language schema with nested phrases
export const languageSchema = z.object({
  name: z.string().min(1, "Language name is required"),
  phrases: z.array(phraseSchema).min(1, "At least one phrase is required"),
});

// Content schema for nation content items
export const contentSchema = z.object({
  title: z.string().min(1, "Content title is required"),
  contentType: z.enum(["IMAGE_UPLOAD", "VIDEO_UPLOAD", "VIDEO_YOUTUBE"]),
  contentUrl: z.string().min(1, "Content URL is required"),
});

export const nationSubmitSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().optional(),
  flagUrl: z.string().optional(),
  boundaryGeoJson: z.string().min(1, "Boundary is required"), // GeoJSON string with MultiPolygon geometry
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

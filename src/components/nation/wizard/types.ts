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

"use client";

import { Text, Divider } from "@mantine/core";
import { getMediaUrl } from "@/lib/media-url";

interface Phrase {
  id: string;
  text: string;
  translation: string;
  audioUrl: string;
}

interface Language {
  id: string;
  name: string;
  phrases: Phrase[];
}

interface LanguagesSectionProps {
  languages: Language[];
}

export function LanguagesSection({ languages }: LanguagesSectionProps) {
  if (languages.length === 0) {
    return <Text c="dimmed">No language information available.</Text>;
  }

  return (
    <div className="space-y-4">
      {languages.map((language, langIndex) => (
        <div key={language.id}>
          <Text size="sm" fw={600} c="dimmed" mb={4}>
            {language.name}
          </Text>
          {language.phrases.length > 0 && (
            <div className="space-y-2">
              {language.phrases.map((phrase, phraseIndex) => (
                <div key={phrase.id}>
                  <div className="flex items-start justify-between gap-4 py-2">
                    <div className="min-w-0 flex-1 break-words">
                      <Text fw={500} size="md" style={{ wordBreak: "break-word" }}>
                        {phrase.text}
                      </Text>
                      <Text size="sm" c="dimmed" style={{ wordBreak: "break-word" }}>
                        {phrase.translation}
                      </Text>
                    </div>
                    <audio controls className="h-8 shrink-0">
                      <source
                        src={getMediaUrl(phrase.audioUrl)}
                        type="audio/mpeg"
                      />
                    </audio>
                  </div>
                  {phraseIndex < language.phrases.length - 1 && <Divider />}
                </div>
              ))}
            </div>
          )}
          {langIndex < languages.length - 1 && <Divider my="md" />}
        </div>
      ))}
    </div>
  );
}

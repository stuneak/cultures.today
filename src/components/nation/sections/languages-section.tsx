"use client";

import { Card, Text, Group, Stack } from "@mantine/core";
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
    return (
      <Card withBorder>
        <Text c="dimmed">No language information available.</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {languages.map((language) => (
        <Card key={language.id} withBorder p="md">
          <Text fw={600} size="lg" mb="md">
            {language.name}
          </Text>
          {language.phrases.length > 0 && (
            <div>
              <Stack gap="sm">
                {language.phrases.map((phrase) => (
                  <Card key={phrase.id} withBorder p="sm">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={500} size="lg">
                          {phrase.text}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Translation: {phrase.translation}
                        </Text>
                      </div>
                      <audio controls className=" h-8">
                        <source
                          src={getMediaUrl(phrase.audioUrl)}
                          type="audio/mpeg"
                        />
                      </audio>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </div>
          )}
        </Card>
      ))}
    </Stack>
  );
}

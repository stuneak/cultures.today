"use client";

import { Card, Text, Group, Stack, Accordion } from "@mantine/core";
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
  description: string;
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
    <Accordion variant="separated">
      {languages.map((language) => (
        <Accordion.Item key={language.id} value={language.id}>
          <Accordion.Control>
            <Text fw={600}>{language.name}</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {language.description}
              </Text>

              {language.phrases.length > 0 && (
                <div>
                  <Text fw={500} size="sm" mb="xs">
                    Common Phrases
                  </Text>
                  <Stack gap="sm">
                    {language.phrases.map((phrase) => (
                      <Card key={phrase.id} withBorder p="sm">
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text fw={500} size="lg">
                              {phrase.text}
                            </Text>
                            <Text size="sm" c="dimmed">
                              {phrase.translation}
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
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

"use client";

import {
  TextInput,
  Textarea,
  Stack,
  Group,
  ActionIcon,
  Button,
  Text,
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
          <Text fw={500}>{language.name || `Language ${index + 1}`}</Text>
          <Text size="sm" c="dimmed">
            {language.phrases.length} phrase
            {language.phrases.length !== 1 ? "s" : ""}
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
            onChange={(e) =>
              onChange({ ...language, description: e.target.value })
            }
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

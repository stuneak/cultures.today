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

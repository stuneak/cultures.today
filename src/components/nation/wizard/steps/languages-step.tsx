"use client";

import { Stack, Button, Text } from "@mantine/core";
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
        Which languages are spoken in your nation? Add at least one, and give a
        few example phrases to bring it to life!
      </Text>

      <Stack gap="lg">
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
      </Stack>

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

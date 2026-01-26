"use client";

import { Stack, Button, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { ContentForm } from "../parts/content-form";
import { INITIAL_CONTENT } from "../types";
import type { WizardFormData, ContentFormData } from "../types";

interface ContentsStepProps {
  data: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  tempSlug: string;
  errors: Record<string, string>;
}

export function ContentsStep({
  data,
  onChange,
  tempSlug,
  errors,
}: ContentsStepProps) {
  const handleContentChange = (index: number, content: ContentFormData) => {
    const newContents = [...data.contents];
    newContents[index] = content;
    onChange({ contents: newContents });
  };

  const handleAddContent = () => {
    onChange({
      contents: [...data.contents, INITIAL_CONTENT()],
    });
  };

  const handleRemoveContent = (index: number) => {
    if (data.contents.length <= 1) return;
    const newContents = data.contents.filter((_, i) => i !== index);
    onChange({ contents: newContents });
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        We’d love to see your nation’s culture! Share its food, music, dances,
        videos, or anything else that tells its story.
      </Text>

      <Stack gap="sm">
        {data.contents.map((content, index) => (
          <ContentForm
            key={content.id}
            content={content}
            onChange={(c) => handleContentChange(index, c)}
            onRemove={() => handleRemoveContent(index)}
            canRemove={data.contents.length > 1}
            tempSlug={tempSlug}
            index={index}
            errors={errors}
          />
        ))}
      </Stack>

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={handleAddContent}
      >
        Add Content
      </Button>

      {errors.contents && (
        <Text size="sm" c="red">
          {errors.contents}
        </Text>
      )}
    </Stack>
  );
}

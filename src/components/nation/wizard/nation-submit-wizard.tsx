"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Stepper, Button, Group, Alert, Stack } from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { BasicInfoStep } from "./steps/basic-info-step";
import { LanguagesStep } from "./steps/languages-step";
import { ContentsStep } from "./steps/contents-step";
import { ReviewStep } from "./steps/review-step";
import {
  INITIAL_FORM_DATA,
  generateTempSlug,
  type WizardFormData,
} from "./types";

interface NationSubmitWizardProps {
  opened: boolean;
  onClose: () => void;
  initialBoundary?: GeoJSON.Feature<GeoJSON.MultiPolygon> | null;
}

const STEP_LABELS = ["Basic Info", "Languages", "Contents", "Review"];

export function NationSubmitWizard({
  opened,
  onClose,
  initialBoundary,
}: NationSubmitWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(() =>
    INITIAL_FORM_DATA(""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [highestCompletedStep, setHighestCompletedStep] = useState(-1);

  // Generate temp slug once per wizard session
  const tempSlug = useMemo(
    () => generateTempSlug(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opened],
  );

  // Initialize form with boundary when modal opens
  useEffect(() => {
    if (opened && initialBoundary) {
      setFormData(INITIAL_FORM_DATA(JSON.stringify(initialBoundary)));
      setActiveStep(0);
      setErrors({});
      setSuccess(false);
      setSubmitError(null);
      setHighestCompletedStep(-1);
    }
  }, [opened, initialBoundary]);

  // Reset on close
  useEffect(() => {
    if (!opened) {
      setFormData(INITIAL_FORM_DATA(""));
      setActiveStep(0);
      setErrors({});
      setSuccess(false);
      setSubmitError(null);
      setHighestCompletedStep(-1);
    }
  }, [opened]);

  const handleChange = (data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Clear relevant errors when data changes
    const newErrors = { ...errors };
    Object.keys(data).forEach((key) => {
      Object.keys(newErrors).forEach((errKey) => {
        if (errKey.startsWith(key)) {
          delete newErrors[errKey];
        }
      });
    });
    setErrors(newErrors);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.name) {
          newErrors.name = "Name is required";
        }

        if (!formData.description) {
          newErrors.description = "Description is required";
        }
        break;

      case 1: // Languages
        if (formData.languages.length === 0) {
          newErrors.languages = "At least one language is required";
        }
        formData.languages.forEach((lang, langIndex) => {
          if (!lang.name.trim()) {
            newErrors[`languages.${langIndex}.name`] = "Required";
          }
          if (lang.phrases.length === 0) {
            newErrors[`languages.${langIndex}.phrases`] =
              "At least one phrase required";
          }
          lang.phrases.forEach((phrase, phraseIndex) => {
            if (!phrase.text.trim()) {
              newErrors[`languages.${langIndex}.phrases.${phraseIndex}.text`] =
                "Required";
            }
            if (!phrase.translation.trim()) {
              newErrors[
                `languages.${langIndex}.phrases.${phraseIndex}.translation`
              ] = "Required";
            }
            if (!phrase.audioUrl) {
              newErrors[
                `languages.${langIndex}.phrases.${phraseIndex}.audioUrl`
              ] = "Audio required";
            }
          });
        });
        break;

      case 2: // Contents
        if (formData.contents.length === 0) {
          newErrors.contents = "At least one content item is required";
        }
        formData.contents.forEach((content, contentIndex) => {
          if (!content.title.trim()) {
            newErrors[`contents.${contentIndex}.title`] = "Required";
          }
          if (!content.contentUrl) {
            newErrors[`contents.${contentIndex}.contentUrl`] =
              content.contentType === "VIDEO_YOUTUBE"
                ? "YouTube URL required"
                : "File required";
          }
          // Validate YouTube URL format
          if (content.contentType === "VIDEO_YOUTUBE" && content.contentUrl) {
            const youtubeRegex =
              /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/;
            if (!youtubeRegex.test(content.contentUrl)) {
              newErrors[`contents.${contentIndex}.contentUrl`] =
                "Invalid YouTube URL";
            }
          }
        });
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setHighestCompletedStep((prev) => Math.max(prev, activeStep));
      setActiveStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStepClick = (step: number) => {
    // Allow going back to any previous step
    if (step < activeStep) {
      setActiveStep(step);
      return;
    }
    // Allow going forward only if step was previously completed
    if (step <= highestCompletedStep + 1 && step <= activeStep + 1) {
      // Validate current step before moving forward
      if (validateStep(activeStep)) {
        setHighestCompletedStep((prev) => Math.max(prev, activeStep));
        setActiveStep(step);
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare data for API
      const submitData = {
        name: formData.name,
        description: formData.description || undefined,
        flagUrl: formData.flagUrl || undefined,
        boundaryGeoJson: formData.boundaryGeoJson,
        languages: formData.languages.map((lang) => ({
          name: lang.name,
          phrases: lang.phrases.map((phrase) => ({
            text: phrase.text,
            translation: phrase.translation,
            audioUrl: phrase.audioUrl,
          })),
        })),
        contents: formData.contents.map((content) => ({
          title: content.title,
          contentType: content.contentType,
          contentUrl: content.contentUrl,
        })),
      };

      const response = await fetch("/api/nations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit nation");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Submit a new nation"
      size="lg"
      radius="md"
      closeOnClickOutside={false}
    >
      {success ? (
        <Alert icon={<IconCheck size={16} />} color="green" title="Success!">
          Your nation has been submitted and is pending review by our
          moderators.
        </Alert>
      ) : (
        <Stack gap="lg">
          <Stepper active={activeStep} onStepClick={handleStepClick} size="sm">
            {STEP_LABELS.map((label) => (
              <Stepper.Step key={label} label={label} />
            ))}
          </Stepper>

          {submitError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              title="Error"
            >
              {submitError}
            </Alert>
          )}

          <div style={{ minHeight: 300 }}>
            {activeStep === 0 && (
              <BasicInfoStep
                data={formData}
                onChange={handleChange}
                tempSlug={tempSlug}
                errors={errors}
              />
            )}
            {activeStep === 1 && (
              <LanguagesStep
                data={formData}
                onChange={handleChange}
                tempSlug={tempSlug}
                errors={errors}
              />
            )}
            {activeStep === 2 && (
              <ContentsStep
                data={formData}
                onChange={handleChange}
                tempSlug={tempSlug}
                errors={errors}
              />
            )}
            {activeStep === 3 && (
              <ReviewStep data={formData} onEditStep={setActiveStep} />
            )}
          </div>

          <Group justify="space-between">
            <Button
              variant="light"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>

            {activeStep < 3 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                Submit Nation
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

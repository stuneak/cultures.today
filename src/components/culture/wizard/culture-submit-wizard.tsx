"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Button, Group, Alert, Stack, Box } from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { z } from "zod";
import { BasicInfoStep } from "./steps/basic-info-step";
import { LanguagesStep } from "./steps/languages-step";
import { ContentsStep } from "./steps/contents-step";
import { ReviewStep } from "./steps/review-step";
import {
  INITIAL_FORM_DATA,
  generateTempSlug,
  type WizardFormData,
} from "./types";
import {
  phraseSchema,
  languageSchema,
  contentSchema,
  youtubeUrlSchema,
} from "@/lib/validations/culture";

interface CultureSubmitWizardProps {
  opened: boolean;
  onClose: () => void;
  initialBoundary?: GeoJSON.Feature<GeoJSON.MultiPolygon> | null;
}

const STEP_LABELS = ["Basic Info", "Languages", "Contents", "Review"];

export function CultureSubmitWizard({
  opened,
  onClose,
  initialBoundary,
}: CultureSubmitWizardProps) {
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

  // Step-specific schemas for validation
  const basicInfoSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    description: z
      .string()
      .min(1, "Description is required")
      .max(800, "Description must be no longer than 800 characters"),
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        const basicInfoResult = basicInfoSchema.safeParse({
          name: formData.name,
          description: formData.description,
        });
        if (!basicInfoResult.success) {
          basicInfoResult.error.issues.forEach((issue) => {
            const path = issue.path.join(".");
            newErrors[path] = issue.message;
          });
        }
        break;

      case 1: // Languages
        if (formData.languages.length === 0) {
          newErrors.languages = "At least one language is required";
        }
        formData.languages.forEach((lang, langIndex) => {
          const langResult = languageSchema.safeParse(lang);
          if (!langResult.success) {
            langResult.error.issues.forEach((issue) => {
              const path = issue.path.join(".");
              if (path === "name") {
                newErrors[`languages.${langIndex}.name`] = issue.message;
              } else if (path === "phrases") {
                newErrors[`languages.${langIndex}.phrases`] = issue.message;
              }
            });
          }
          lang.phrases.forEach((phrase, phraseIndex) => {
            const phraseResult = phraseSchema.safeParse(phrase);
            if (!phraseResult.success) {
              phraseResult.error.issues.forEach((issue) => {
                const field = String(issue.path[0]);
                newErrors[
                  `languages.${langIndex}.phrases.${phraseIndex}.${field}`
                ] = issue.message;
              });
            }
          });
        });
        break;

      case 2: // Contents
        if (formData.contents.length === 0) {
          newErrors.contents = "At least one content item is required";
        }
        formData.contents.forEach((content, contentIndex) => {
          const contentResult = contentSchema.safeParse(content);
          if (!contentResult.success) {
            contentResult.error.issues.forEach((issue) => {
              const field = String(issue.path[0]);
              if (field === "contentUrl" && !content.contentUrl) {
                newErrors[`contents.${contentIndex}.contentUrl`] =
                  content.contentType === "VIDEO_YOUTUBE"
                    ? "YouTube URL required"
                    : "File required";
              } else {
                newErrors[`contents.${contentIndex}.${field}`] = issue.message;
              }
            });
          }
          // Additional YouTube URL format validation
          if (content.contentType === "VIDEO_YOUTUBE" && content.contentUrl) {
            const youtubeResult = youtubeUrlSchema.safeParse(
              content.contentUrl,
            );
            if (!youtubeResult.success) {
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
    // Allow going forward to any previously completed step or the next step
    if (step <= highestCompletedStep + 1) {
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
        description: formData.description,
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

      const response = await fetch("/api/cultures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit culture");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 5000);
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
      title="Share your culture with us"
      size="lg"
      closeOnClickOutside={false}
    >
      {success ? (
        <Alert color="blue" variant="light">
          Thanks for your submission! Your culture is now pending review by our
          moderators 🎉
        </Alert>
      ) : (
        <Stack gap="lg">
          {/* Custom compact stepper */}
          <Box py="sm">
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              {STEP_LABELS.map((label, index) => {
                const isCompleted = index <= highestCompletedStep;
                const isActive = index === activeStep;
                const isClickable =
                  index < activeStep || index <= highestCompletedStep + 1;
                const isLast = index === STEP_LABELS.length - 1;

                return (
                  <Box
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: isLast ? "0 0 auto" : 1,
                    }}
                  >
                    {/* Step circle */}
                    <Box
                      onClick={() => isClickable && handleStepClick(index)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background:
                          isActive || isCompleted
                            ? "var(--mantine-color-text)"
                            : "transparent",
                        color:
                          isActive || isCompleted
                            ? "var(--mantine-color-body)"
                            : "var(--mantine-color-dimmed)",
                        cursor: isClickable ? "pointer" : "default",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow:
                          isActive || isCompleted
                            ? "var(--mantine-shadow-sm)"
                            : "none",
                        border:
                          !isActive && !isCompleted
                            ? "2px solid var(--mantine-color-default-border)"
                            : "none",
                        transform: isActive ? "scale(1.1)" : "scale(1)",
                      }}
                    >
                      {isCompleted && !isActive ? (
                        <IconCheck size={18} strokeWidth={3} />
                      ) : (
                        index + 1
                      )}
                    </Box>

                    {/* Connector line */}
                    {!isLast && (
                      <Box
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background:
                            index < activeStep || isCompleted
                              ? "var(--mantine-color-text)"
                              : "var(--mantine-color-default-border)",
                          transition: "all 0.3s ease",
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

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
            {activeStep === 3 && <ReviewStep data={formData} />}
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
                Submit Culture
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

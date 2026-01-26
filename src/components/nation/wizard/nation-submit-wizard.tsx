"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Button, Group, Alert, Stack, Box } from "@mantine/core";
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
      closeOnClickOutside={false}
    >
      {success ? (
        <Alert icon={<IconCheck size={16} />} color="green" title="Success!">
          Your nation has been submitted and is pending review by our
          moderators.
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
                        background: isActive
                          ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                          : isCompleted
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "var(--mantine-color-gray-1)",
                        color:
                          isActive || isCompleted
                            ? "white"
                            : "var(--mantine-color-gray-5)",
                        cursor: isClickable ? "pointer" : "default",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: isActive
                          ? "0 4px 14px rgba(59, 130, 246, 0.4)"
                          : isCompleted
                            ? "0 2px 8px rgba(16, 185, 129, 0.3)"
                            : "none",
                        border:
                          !isActive && !isCompleted
                            ? "2px solid var(--mantine-color-gray-3)"
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
                              ? "linear-gradient(90deg, #10b981, #059669)"
                              : "var(--mantine-color-gray-2)",
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

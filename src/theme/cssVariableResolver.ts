import { alpha, CSSVariablesResolver } from "@mantine/core";

export const shadcnCssVariableResolver: CSSVariablesResolver = () => ({
  variables: {
    "--mantine-heading-font-weight": "600",
    "--mantine-primary-color-filled-hover": alpha(
      "var(--mantine-primary-color-filled)",
      0.9
    ),
    "--mantine-primary-color-light": "var(--mantine-color-slate-light)",
    "--mantine-primary-color-light-hover": "var(--mantine-color-slate-light-hover)",
    "--mantine-primary-color-light-color": "var(--mantine-color-slate-light-color)",
  },
  light: {
    "--mantine-primary-color-contrast": "var(--mantine-color-slate-0)",
    "--mantine-color-text": "var(--mantine-color-secondary-9)",
    "--mantine-color-body": "var(--mantine-color-white)",
    "--mantine-color-error": "var(--mantine-color-error-10)",
    "--mantine-color-placeholder": "var(--mantine-color-secondary-10)",
    "--mantine-color-anchor": "var(--mantine-color-secondary-10)",
    "--mantine-color-default": "var(--mantine-color-secondary-0)",
    "--mantine-color-default-hover": "var(--mantine-color-secondary-1)",
    "--mantine-color-default-color": "var(--mantine-color-secondary-9)",
    "--mantine-color-default-border": "var(--mantine-color-secondary-2)",
    "--mantine-color-dimmed": "var(--mantine-color-secondary-10)",
    "--mantine-color-secondary-filled": "var(--mantine-color-white)",
    "--mantine-color-secondary-filled-hover": "var(--mantine-color-secondary-1)",
    "--mantine-color-secondary-light": "var(--mantine-color-secondary-1)",
    "--mantine-color-secondary-light-hover": alpha(
      "var(--mantine-color-secondary-light)",
      0.8
    ),
    "--mantine-color-secondary-outline": "var(--mantine-color-secondary-9)",
    "--mantine-color-secondary-outline-hover": alpha(
      "var(--mantine-color-secondary-outline)",
      0.05
    ),
  },
  dark: {
    "--mantine-primary-color-contrast": "var(--mantine-color-slate-9)",
    "--mantine-color-text": "var(--mantine-color-secondary-0)",
    "--mantine-color-body": "var(--mantine-color-secondary-9)",
    "--mantine-color-error": "var(--mantine-color-error-10)",
    "--mantine-color-placeholder": "var(--mantine-color-secondary-4)",
    "--mantine-color-anchor": "var(--mantine-color-secondary-4)",
    "--mantine-color-default": "var(--mantine-color-secondary-9)",
    "--mantine-color-default-hover": "var(--mantine-color-secondary-7)",
    "--mantine-color-default-color": "var(--mantine-color-secondary-1)",
    "--mantine-color-default-border": "var(--mantine-color-secondary-7)",
    "--mantine-color-dimmed": "var(--mantine-color-secondary-4)",
    "--mantine-color-secondary-filled": "var(--mantine-color-secondary-8)",
    "--mantine-color-secondary-filled-hover": "var(--mantine-color-secondary-7)",
    "--mantine-color-secondary-light": "var(--mantine-color-secondary-7)",
    "--mantine-color-secondary-light-hover": alpha(
      "var(--mantine-color-secondary-light)",
      0.8
    ),
    "--mantine-color-secondary-outline": "var(--mantine-color-secondary-0)",
    "--mantine-color-secondary-outline-hover": alpha(
      "var(--mantine-color-secondary-outline)",
      0.05
    ),
  },
});

import {
  Container,
  createTheme,
  Paper,
  Card,
  Dialog,
  rem,
  type MantineColorsTuple,
} from "@mantine/core";

const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem("200px"),
  xs: rem("300px"),
  sm: rem("400px"),
  md: rem("500px"),
  lg: rem("600px"),
  xl: rem("1400px"),
  xxl: rem("1600px"),
};

const slateColors: MantineColorsTuple = [
  "#f8fafc",
  "#f1f5f9",
  "#e2e8f0",
  "#cbd5e1",
  "#94a3b8",
  "#475569",
  "#334155",
  "#1e293b",
  "#0f172a",
  "#020817",
];

const blueColors: MantineColorsTuple = [
  "#eff6ff",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1e40af",
  "#1e3a8a",
  "#172554",
];

const greenColors: MantineColorsTuple = [
  "#F0FDF4",
  "#DCFCE7",
  "#BBF7D0",
  "#86EFAC",
  "#4ADE80",
  "#22c55e",
  "#16A34A",
  "#166534",
  "#14532D",
  "#052E16",
];

const redColors: MantineColorsTuple = [
  "#FEF2F2",
  "#FEE2E2",
  "#FECACA",
  "#FCA5A5",
  "#F87171",
  "#DC2626",
  "#B91C1C",
  "#991B1B",
  "#7F1D1D",
  "#450A0A",
];

const amberColors: MantineColorsTuple = [
  "#FFFBEB",
  "#FEF3C7",
  "#FDE68A",
  "#FCD34D",
  "#FBBF24",
  "#f59e0b",
  "#D97706",
  "#92400E",
  "#78350F",
  "#451A03",
];

export const shadcnTheme = createTheme({
  colors: {
    slate: slateColors,
    blue: blueColors,
    green: greenColors,
    red: redColors,
    amber: amberColors,
    primary: slateColors,
    secondary: slateColors,
    dark: slateColors,
    error: redColors,
    success: greenColors,
    info: blueColors,
    warning: amberColors,
  },
  focusRing: "never",
  scale: 1,
  primaryColor: "primary",
  primaryShade: { light: 8, dark: 0 },
  autoContrast: true,
  luminanceThreshold: 0.3,
  fontFamily: "Geist, system-ui, sans-serif",
  radius: {
    xs: rem("6px"),
    sm: rem("8px"),
    md: rem("12px"),
    lg: rem("16px"),
    xl: rem("24px"),
  },
  defaultRadius: "sm",
  cursorType: "pointer",
  components: {
    Container: Container.extend({
      vars: (_, { size, fluid }) => ({
        root: {
          "--container-size": fluid
            ? "100%"
            : size !== undefined && size in CONTAINER_SIZES
            ? CONTAINER_SIZES[size]
            : rem(size as number),
        },
      }),
    }),
    Paper: Paper.extend({
      defaultProps: {
        shadow: "xl",
      },
    }),
    Card: Card.extend({
      defaultProps: {
        p: "xl",
        shadow: "xl",
        withBorder: true,
      },
    }),
    Dialog: Dialog.extend({
      defaultProps: {
        withBorder: true,
      },
    }),
  },
});

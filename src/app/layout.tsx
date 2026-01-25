import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { MantineProviderWrapper } from "@/components/providers/mantine-provider";
import { ColorSchemeScript } from "@mantine/core";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cultures.com - Explore World Cultures",
  description: "Interactive map exploring nations and their cultures",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className={geist.className}>
        <MantineProviderWrapper>{children}</MantineProviderWrapper>
      </body>
    </html>
  );
}

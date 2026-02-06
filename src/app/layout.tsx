import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { MantineProviderWrapper } from "@/components/providers/mantine-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ColorSchemeScript } from "@mantine/core";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cultures.today - Explore World Cultures",
  description: "Interactive map exploring cultures around the world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="D3WrN07BKXpbyGUsfKW49789Fc3XXYUlaOujd-YHx8w" />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className={geist.className}>
        <SessionProvider>
          <MantineProviderWrapper>{children}</MantineProviderWrapper>
        </SessionProvider>
      </body>
    </html>
  );
}

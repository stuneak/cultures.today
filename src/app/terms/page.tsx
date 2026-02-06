import type { Metadata } from "next";
import { Container, Title, Text, Stack, Divider } from "@mantine/core";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Cultures.today",
  description: "Terms of service for Cultures.today",
};

export default function TermsPage() {
  return (
    <Container size="lg" py="xl">
      <Link
        href="/"
        style={{
          fontSize: "var(--mantine-font-size-sm)",
          marginBottom: "var(--mantine-spacing-lg)",
          display: "block",
        }}
      >
        &larr; Back to map
      </Link>

      <Stack gap="lg">
        <Title order={1}>Terms of Service</Title>
        <Text c="dimmed" size="sm">
          Last updated: February 2025
        </Text>

        <Divider />

        <section>
          <Title order={3} mb="xs">
            1. Acceptance of Terms
          </Title>
          <Text>
            By accessing or using Cultures.today, you agree to be bound by these
            terms of service. If you do not agree, please do not use the
            service.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            2. Description of Service
          </Title>
          <Text>
            Cultures.today is an interactive web application for exploring and
            documenting cultures around the world. Users can view culture data
            on a map and submit their own cultural knowledge.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            3. User Accounts
          </Title>
          <Text>
            You may sign in using Google OAuth. You are responsible for
            maintaining the security of your account. You must not share your
            session or allow unauthorized access to your account.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            4. User-Submitted Content
          </Title>
          <Text>
            When you submit content to Cultures.today, you agree that:
          </Text>
          <Text component="ul" ml="md" mt="xs">
            <li>You have the right to share the content you submit</li>
            <li>Your content does not infringe on any third-party rights</li>
            <li>Your content is accurate to the best of your knowledge</li>
            <li>
              You grant Cultures.today a non-exclusive license to display and
              distribute your submitted content as part of the service
            </li>
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            5. Prohibited Use
          </Title>
          <Text>You agree not to:</Text>
          <Text component="ul" ml="md" mt="xs">
            <li>Submit false, misleading, or offensive cultural information</li>
            <li>Upload malicious files or content</li>
            <li>
              Attempt to gain unauthorized access to the service or its
              infrastructure
            </li>
            <li>Use the service to harass, abuse, or harm others</li>
            <li>Scrape or bulk-download data from the service</li>
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            6. Content Moderation
          </Title>
          <Text>
            We reserve the right to review, edit, or remove any user-submitted
            content at our discretion. Submitted cultures may undergo review
            before being published on the map.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            7. Disclaimer
          </Title>
          <Text>
            Cultures.today is provided &quot;as is&quot; without warranties of
            any kind. Cultural information displayed on the platform is
            user-contributed and may not be fully accurate or complete. We do
            not guarantee the accuracy of any content on the platform.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            8. Limitation of Liability
          </Title>
          <Text>
            To the fullest extent permitted by law, Cultures.today shall not be
            liable for any indirect, incidental, or consequential damages
            arising from your use of the service.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            9. Changes to Terms
          </Title>
          <Text>
            We may update these terms from time to time. Continued use of the
            service after changes constitutes acceptance of the new terms.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            10. Contact
          </Title>
          <Text>
            For questions about these terms, please reach out through the
            project&apos;s GitHub repository.
          </Text>
        </section>
      </Stack>
    </Container>
  );
}

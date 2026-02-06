import type { Metadata } from "next";
import { Container, Title, Text, Stack, Divider } from "@mantine/core";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Cultures.today",
  description: "Privacy policy for Cultures.today",
};

export default function PrivacyPage() {
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
        <Title order={1}>Privacy Policy</Title>
        <Text c="dimmed" size="sm">
          Last updated: February 2025
        </Text>

        <Divider />

        <section>
          <Title order={3} mb="xs">
            1. Information We Collect
          </Title>
          <Text>
            When you use Cultures.today, we may collect the following
            information:
          </Text>
          <Text component="ul" ml="md" mt="xs">
            <li>
              <strong>Account information:</strong> If you sign in with Google,
              we receive your name, email address, and profile picture from
              Google OAuth.
            </li>
            <li>
              <strong>User-submitted content:</strong> Culture descriptions,
              boundary drawings, images, audio recordings, and other content you
              submit.
            </li>
            <li>
              <strong>Usage data:</strong> Pages visited, interactions with the
              map, and general usage patterns.
            </li>
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            2. How We Use Your Information
          </Title>
          <Text>We use collected information to:</Text>
          <Text component="ul" ml="md" mt="xs">
            <li>Provide and maintain the Cultures.today service</li>
            <li>Associate submitted cultures with your account</li>
            <li>Improve the application and user experience</li>
            <li>Communicate with you about your submissions</li>
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            3. Data Storage
          </Title>
          <Text>
            Your data is stored on secure servers. Uploaded media (images,
            audio) is stored in our object storage system. We take reasonable
            measures to protect your personal information.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            4. Third-Party Services
          </Title>
          <Text>We use the following third-party services:</Text>
          <Text component="ul" ml="md" mt="xs">
            <li>
              <strong>Google OAuth:</strong> For authentication. Google&apos;s
              privacy policy applies to data they collect during sign-in.
            </li>
            <li>
              <strong>Map tiles:</strong> Map data is loaded from third-party
              tile providers, which may collect usage information.
            </li>
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            5. Cookies
          </Title>
          <Text>
            We use essential cookies for authentication sessions. We do not use
            tracking or advertising cookies.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            6. Your Rights
          </Title>
          <Text>
            You may request deletion of your account and associated data by
            contacting us. You can revoke Google OAuth access at any time
            through your Google account settings.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            7. Changes to This Policy
          </Title>
          <Text>
            We may update this privacy policy from time to time. Changes will be
            posted on this page with an updated revision date.
          </Text>
        </section>

        <section>
          <Title order={3} mb="xs">
            8. Contact
          </Title>
          <Text>
            If you have questions about this privacy policy, please reach out
            through the project&apos;s GitHub repository.
          </Text>
        </section>
      </Stack>
    </Container>
  );
}

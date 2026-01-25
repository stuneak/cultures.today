import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Container, Title, Text, Paper } from "@mantine/core";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  if (!session.user.isAdmin) {
    return (
      <Container size="sm" className="py-20">
        <Paper p="xl" withBorder>
          <Title order={2} c="red" mb="md">
            Access Denied
          </Title>
          <Text c="dimmed">
            You do not have permission to access the admin panel.
          </Text>
        </Paper>
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Container size="xl" className="py-4">
          <Title order={2}>Admin Panel</Title>
        </Container>
      </header>
      <Container size="xl" className="py-8">
        {children}
      </Container>
    </div>
  );
}

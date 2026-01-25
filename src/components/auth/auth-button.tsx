"use client";

import { Button, Menu, Avatar, Text } from "@mantine/core";
import { IconLogin, IconLogout, IconUser, IconShield } from "@tabler/icons-react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Button loading variant="subtle" />;
  }

  if (!session) {
    return (
      <Button
        leftSection={<IconLogin size={16} />}
        variant="light"
        onClick={() => signIn("google")}
      >
        Sign in with Google
      </Button>
    );
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button variant="subtle" className="px-2">
          <Avatar
            src={session.user.image}
            alt={session.user.name || "User"}
            radius="xl"
            size="sm"
          />
          <Text ml="xs" size="sm" className="hidden sm:inline">
            {session.user.name}
          </Text>
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Account</Menu.Label>
        <Menu.Item leftSection={<IconUser size={14} />}>
          Profile
        </Menu.Item>
        {session.user.isAdmin && (
          <Menu.Item
            leftSection={<IconShield size={14} />}
            component={Link}
            href="/admin"
          >
            Admin Panel
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={14} />}
          onClick={() => signOut()}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

"use client";

import { useState } from "react";
import {
  IconPlus,
  IconMinus,
  IconSun,
  IconMoon,
  IconInfoCircle,
  IconCurrentLocation,
  IconUser,
  IconLogout,
  IconX,
  IconKeyboard,
  IconMap,
  IconCompass,
  IconShield,
} from "@tabler/icons-react";
import Link from "next/link";
import {
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
  Button,
  Menu,
  Box,
  Text,
  Group,
  Kbd,
  Divider,
  Anchor,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useSession, signIn, signOut } from "next-auth/react";
import { useMapStore } from "@/stores/map-store";
import { useIconStyles } from "./use-icon-styles";
import "./styles.css";

const toolTipStyles = {
  position: "left" as const,
  openDelay: 500,
};

const shortcuts: { keys: string[]; action: string; separator?: string }[] = [
  { keys: ["W"], action: "Toggle pan / draw mode" },
  { keys: ["S"], action: "Toggle draw / erase" },
  { keys: ["A"], action: "Decrease brush size" },
  { keys: ["D"], action: "Increase brush size" },
  { keys: ["Ctrl", "Z"], action: "Undo", separator: "+" },
  { keys: ["Enter"], action: "Create culture" },
  { keys: ["Esc"], action: "Cancel drawing" },
];

function InfoModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 99999998,
          opacity: opened ? 1 : 0,
          pointerEvents: opened ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Modal */}
      <Box
        className="info-modal"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: opened
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.95)",
          zIndex: 99999999,
          width: "min(420px, 90vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          opacity: opened ? 1 : 0,
          pointerEvents: opened ? "auto" : "none",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box className="info-modal-inner">
          {/* Header */}
          <Box className="info-modal-header">
            <Group gap="sm" align="center">
              <Text
                component="h2"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Cultures.today
              </Text>
            </Group>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onClose}
              radius="xl"
              size="lg"
            >
              <IconX size={18} />
            </ActionIcon>
          </Box>

          <Divider className="info-modal-divider" />
          {/* About Section */}
          <Box className="info-modal-section">
            <Group gap="xs" mb="sm">
              <IconMap
                size={18}
                strokeWidth={1.5}
                className="info-modal-icon"
              />
              <Text
                size="xs"
                fw={600}
                tt="uppercase"
                className="info-modal-label"
              >
                About
              </Text>
            </Group>
            <Text size="sm" className="info-modal-text" lh={1.6}>
              {`This interactive map lets you explore all kinds of cultures, local
              customs, and dive into some seriously cool stories. Its like
              traveling the world without ever leaving your couch! ✈️`}
            </Text>
          </Box>

          <Divider className="info-modal-divider" />

          {/* Shortcuts Section */}
          <Box className="info-modal-section">
            <Group gap="xs" mb="md">
              <IconKeyboard
                size={18}
                strokeWidth={1.5}
                className="info-modal-icon"
              />
              <Text
                size="xs"
                fw={600}
                tt="uppercase"
                className="info-modal-label"
              >
                Keyboard Shortcuts
              </Text>
            </Group>
            <Box className="shortcuts-grid">
              {shortcuts.map((shortcut, index) => (
                <Group
                  key={index}
                  justify="space-between"
                  className="shortcut-row"
                >
                  <Text size="sm" className="info-modal-text">
                    {shortcut.action}
                  </Text>
                  <Group gap={4}>
                    {shortcut.keys.map((key, keyIndex) => (
                      <span
                        key={keyIndex}
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        <Kbd size="sm" className="shortcut-kbd">
                          {key}
                        </Kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <Text span size="xs" c="dimmed" mx={4}>
                            {shortcut.separator || "/"}
                          </Text>
                        )}
                      </span>
                    ))}
                  </Group>
                </Group>
              ))}
            </Box>
          </Box>

          <Divider className="info-modal-divider" />
          {/* Footer */}
          <Box className="info-modal-footer">
            <Text size="xs" c="dimmed" ta="center">
              Made with love 🫶 Explore freely
            </Text>
            <Text size="xs" c="dimmed" ta="center" mt={4}>
              Contact: stuneak@gmail.com
            </Text>
            <Group justify="center" gap="xs" mt={4}>
              <Anchor href="/privacy" size="xs" c="dimmed" component="a">
                Privacy
              </Anchor>
              <Text size="xs" c="dimmed">·</Text>
              <Anchor href="/terms" size="xs" c="dimmed" component="a">
                Terms
              </Anchor>
            </Group>
          </Box>
        </Box>
      </Box>
    </>
  );
}

function TopControls() {
  const { data: session, status } = useSession();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { iconStyles } = useIconStyles();

  const handleLogout = () => {
    signOut();
    setProfileMenuOpen(false);
  };

  return (
    <nav className="top-controls mt-2">
      <ActionIcon.Group orientation="vertical">
        <div className="h-[40px]">
          {status === "authenticated" && session?.user && (
            <Menu
              opened={profileMenuOpen}
              onChange={setProfileMenuOpen}
              position="left"
              shadow="md"
              withArrow
            >
              <Menu.Target>
                <Tooltip
                  {...toolTipStyles}
                  label="My Profile"
                  disabled={profileMenuOpen}
                >
                  <ActionIcon
                    variant="main-page-control"
                    size={iconStyles.size + 20}
                    radius="xl"
                    aria-label="User profile"
                  >
                    <IconUser {...iconStyles} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>

              <Menu.Dropdown>
                {/* <Menu.Item leftSection={<IconUser size={14} />}>
                  My Profile
                </Menu.Item> */}
                {/* <Menu.Divider /> */}
                <Link href="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Menu.Item
                    leftSection={<IconShield size={14} />}
                  >
                    Admin
                  </Menu.Item>
                </Link>
                <Menu.Divider />
                <Menu.Item
                  className="menu-item-color-dark-red"
                  // color="red"
                  onClick={handleLogout}
                  leftSection={<IconLogout size={14} />}
                >
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
          {status === "unauthenticated" && (
            <Tooltip {...toolTipStyles} label="Sign In">
              <Button
                variant="main-page-control"
                size="sm"
                onClick={() => signIn("google")}
                radius="md"
              >
                Sign in
              </Button>
            </Tooltip>
          )}
        </div>
      </ActionIcon.Group>
    </nav>
  );
}

function MiddleControls() {
  const { actionIconStyles, iconStyles } = useIconStyles();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const [infoOpened, { open: openInfo, close: closeInfo }] =
    useDisclosure(false);

  return (
    <nav>
      <InfoModal opened={infoOpened} onClose={closeInfo} />
      <ActionIcon.Group orientation="vertical">
        <Tooltip {...toolTipStyles} label="About">
          <ActionIcon
            {...actionIconStyles}
            aria-label="Info"
            onClick={openInfo}
          >
            <IconInfoCircle {...iconStyles} />
          </ActionIcon>
        </Tooltip>
        <Tooltip {...toolTipStyles} label="Change theme">
          <ActionIcon
            {...actionIconStyles}
            onClick={() =>
              setColorScheme(computedColorScheme === "light" ? "dark" : "light")
            }
            aria-label="Change theme"
          >
            <IconSun {...iconStyles} className="light" />
            <IconMoon {...iconStyles} className="dark" />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>
    </nav>
  );
}

function BottomControls() {
  const { zoomIn, zoomOut, locateMe } = useMapStore();
  const { actionIconStyles, iconStyles } = useIconStyles();

  return (
    <nav className="mb-2">
      <ActionIcon.Group orientation="vertical">
        <Tooltip {...toolTipStyles} label="Zoom in">
          <ActionIcon
            {...actionIconStyles}
            onClick={zoomIn}
            aria-label="Zoom in"
          >
            <IconPlus {...iconStyles} />
          </ActionIcon>
        </Tooltip>
        <Tooltip {...toolTipStyles} label="Zoom out">
          <ActionIcon
            {...actionIconStyles}
            onClick={zoomOut}
            aria-label="Zoom out"
          >
            <IconMinus {...iconStyles} />
          </ActionIcon>
        </Tooltip>
        <Tooltip {...toolTipStyles} label="Locate me">
          <ActionIcon
            {...actionIconStyles}
            onClick={locateMe}
            aria-label="Locate me"
          >
            <IconCurrentLocation {...iconStyles} />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>
    </nav>
  );
}

export function MainPageControls() {
  return (
    <div className="main-page-controls-container mr-2">
      <TopControls />
      <MiddleControls />
      <BottomControls />
    </div>
  );
}

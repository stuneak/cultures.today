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
} from "@tabler/icons-react";
import {
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
  Avatar,
  Button,
  Menu,
} from "@mantine/core";
import { useSession, signIn, signOut } from "next-auth/react";
import { useMapStore } from "@/stores/map-store";
import { useIconStyles } from "./use-icon-styles";
import "./styles.css";

const toolTipStyles = {
  position: "left" as const,
  openDelay: 500,
};

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
                  <Avatar
                    src={session.user.image}
                    radius="xl"
                    size={iconStyles.size + 20}
                    alt="User profile"
                    style={{ cursor: "pointer" }}
                    name={session.user.email || ""}
                  />
                </Tooltip>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item leftSection={<IconUser size={14} />}>
                  My Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
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

  return (
    <nav>
      <ActionIcon.Group orientation="vertical">
        <Tooltip {...toolTipStyles} label="About the project">
          <ActionIcon {...actionIconStyles} aria-label="Info">
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

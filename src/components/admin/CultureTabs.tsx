"use client";

import { SegmentedControl } from "@mantine/core";

interface CultureTabsProps {
  activeTab: "pending" | "approved";
  onTabChange: (tab: "pending" | "approved") => void;
}

export function CultureTabs({ activeTab, onTabChange }: CultureTabsProps) {
  return (
    <SegmentedControl
      value={activeTab}
      onChange={(value) => onTabChange(value as "pending" | "approved")}
      data={[
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
      ]}
    />
  );
}

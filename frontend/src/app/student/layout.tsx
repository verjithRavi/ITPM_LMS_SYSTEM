"use client";

import type { ReactNode } from "react";
import RoleSidebarShell from "@/components/RoleSidebarShell";
import LiveChat from "@/components/chat/LiveChat";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoleSidebarShell role="student">{children}</RoleSidebarShell>
      <LiveChat userRole="student" userId="student" />
    </>
  );
}

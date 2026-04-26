"use client";

import type { ReactNode } from "react";
import RoleSidebarShell from "@/components/RoleSidebarShell";
import LiveChat from "@/components/chat/LiveChat";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoleSidebarShell role="admin">{children}</RoleSidebarShell>
      <LiveChat userRole="admin" userId="admin" />
    </>
  );
}

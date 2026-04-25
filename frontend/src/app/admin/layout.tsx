"use client";

import type { ReactNode } from "react";
import RoleSidebarShell from "@/components/RoleSidebarShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleSidebarShell role="admin">{children}</RoleSidebarShell>;
}

"use client";

import type { ReactNode } from "react";
import RoleSidebarShell from "@/components/RoleSidebarShell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <RoleSidebarShell role="student">{children}</RoleSidebarShell>;
}

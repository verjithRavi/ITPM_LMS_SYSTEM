"use client";

import type { ReactNode } from "react";
import RoleSidebarShell from "@/components/RoleSidebarShell";

export default function TutorLayout({ children }: { children: ReactNode }) {
  return <RoleSidebarShell role="tutor">{children}</RoleSidebarShell>;
}

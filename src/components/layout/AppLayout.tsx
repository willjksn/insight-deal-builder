"use client";

import { ReactNode } from "react";
import { AuthGuard } from "./AuthGuard";

export function AppLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { canUseShotScout } from "@/lib/utils/permissions";

export function ScriptWriterSidebarNav() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const active = pathname.startsWith("/script-writer");

  if (!canUseShotScout(appUser)) return null;

  return (
    <Link
      href="/script-writer"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-slate-800 text-white shadow-inner ring-1 ring-violet-400/30"
          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
      )}
    >
      <ScrollText className={cn("h-5 w-5 shrink-0", active && "text-violet-400")} />
      Script writer
    </Link>
  );
}

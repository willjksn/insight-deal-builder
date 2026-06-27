"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { canUseShotScout } from "@/lib/utils/permissions";

export function ScoutSidebarNav() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const active = pathname.startsWith("/scout");

  if (!canUseShotScout(appUser)) return null;

  return (
    <Link
      href="/scout"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-slate-800 text-white shadow-inner ring-1 ring-sky-400/30"
          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
      )}
    >
      <Clapperboard className={cn("h-5 w-5 shrink-0", active && "text-sky-400")} />
      Shot Scout
    </Link>
  );
}

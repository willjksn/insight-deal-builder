"use client";

import { useRouter } from "next/navigation";
import { Aperture, Briefcase, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACES, WORKSPACE_HOME, WORKSPACE_LABELS, Workspace } from "@/lib/workspace/types";

const WORKSPACE_ICONS: Record<Workspace, typeof Briefcase> = {
  business: Briefcase,
  production: Clapperboard,
  "shoot-guide": Aperture,
};

/**
 * Segmented [ Business ] [ Production ] [ Shoot Guide ] control. Switching
 * updates the persisted workspace and lands on that workspace's home.
 */
export function WorkspaceSwitcher({
  variant = "sidebar",
  className,
}: {
  variant?: "sidebar" | "mobile";
  className?: string;
}) {
  const router = useRouter();
  const { workspace, setWorkspace } = useWorkspace();

  const handleSelect = (next: Workspace) => {
    if (next === workspace) return;
    setWorkspace(next);
    router.push(WORKSPACE_HOME[next]);
  };

  const dark = variant === "sidebar";

  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className={cn(
        "grid grid-cols-3 gap-1 rounded-xl p-1",
        dark ? "bg-slate-800/80 ring-1 ring-slate-700/70" : "bg-slate-100 ring-1 ring-slate-200",
        className
      )}
    >
      {WORKSPACES.map((option) => {
        const Icon = WORKSPACE_ICONS[option];
        const active = option === workspace;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => handleSelect(option)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-semibold leading-tight transition-colors min-h-[44px]",
              dark ? "sm:px-1" : "sm:px-1.5 sm:text-[11px]",
              active
                ? dark
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : dark
                  ? "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-sky-600")} />
            <span className="max-w-full px-0.5 text-center leading-tight whitespace-normal">
              {WORKSPACE_LABELS[option]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Briefcase, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACES, WORKSPACE_LABELS, Workspace } from "@/lib/workspace/types";

const WORKSPACE_ICONS: Record<Workspace, typeof Briefcase> = {
  business: Briefcase,
  production: Clapperboard,
};

/**
 * Segmented [ Business ] [ Production ] control. Switching updates the persisted
 * workspace and lands the user on the workspace-aware dashboard so the change is
 * immediately visible (sidebar, dashboard, and AI context all follow).
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
    router.push("/dashboard");
  };

  const dark = variant === "sidebar";

  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className={cn(
        "grid grid-cols-2 gap-1 rounded-xl p-1",
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
              "flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors min-h-[40px]",
              active
                ? dark
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : dark
                  ? "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-sky-600")} />
            {WORKSPACE_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Light wrapper — matches main app canvas; no separate dark theme. */
export function ScoutShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-h-full", className)}>{children}</div>;
}

export function ScoutCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-md shadow-slate-200/40 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ScoutScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 85
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : score >= 70
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ring-1 ${tone}`}
    >
      {score}
    </span>
  );
}

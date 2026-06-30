"use client";

import Link from "next/link";
import { Clapperboard, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductionDay } from "@/lib/production/types";
import { cn } from "@/lib/utils/cn";

export type ProductionDayView = "call-sheet" | "shots";

interface ProductionDayNavProps {
  projectId: string;
  dayId: string;
  sortedDays: ProductionDay[];
  activeView: ProductionDayView;
  onAddDay: () => void;
  onRemoveDay?: (dayId: string) => void;
}

export function ProductionDayNav({
  projectId,
  dayId,
  sortedDays,
  activeView,
  onAddDay,
  onRemoveDay,
}: ProductionDayNavProps) {
  const day = sortedDays.find((d) => d.id === dayId);
  const dayLabel = day
    ? `Day ${day.dayNumber}${day.title && day.title !== `Day ${day.dayNumber}` ? `: ${day.title}` : ""}`
    : "Day";

  return (
    <div className="mb-6 print:hidden space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Production days
        </span>
        {sortedDays.map((d) => (
          <Link
            key={d.id}
            href={
              d.id === dayId
                ? activeView === "call-sheet"
                  ? `/projects/${projectId}/production/days/${d.id}`
                  : `/projects/${projectId}/production/days/${d.id}/shots`
                : `/projects/${projectId}/production/days/${d.id}`
            }
            className={cn(
              "inline-flex max-w-[220px] items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              d.id === dayId
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <span className="truncate">
              Day {d.dayNumber}
              {d.title && d.title !== `Day ${d.dayNumber}` ? `: ${d.title}` : ""}
            </span>
          </Link>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={onAddDay}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add day
        </Button>
      </div>

      {day && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">{dayLabel}</span>
          <span className="text-slate-300">·</span>
          <Link
            href={`/projects/${projectId}/production/days/${dayId}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeView === "call-sheet"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <FileText className="h-4 w-4" />
            Call sheet
          </Link>
          <Link
            href={`/projects/${projectId}/production/days/${dayId}/shots`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeView === "shots"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <Clapperboard className="h-4 w-4" />
            Shot list
            {day.shots.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">
                {day.shots.filter((s) => s.done).length}/{day.shots.length}
              </span>
            )}
          </Link>
        </div>
      )}

      {sortedDays.length > 1 && onRemoveDay && (
        <button
          type="button"
          onClick={() => onRemoveDay(dayId)}
          className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove this day
        </button>
      )}
    </div>
  );
}

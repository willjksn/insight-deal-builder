"use client";

import Link from "next/link";
import type { ProductionDayShot } from "@/lib/production/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { cn } from "@/lib/utils/cn";

interface CoverageDayStripProps {
  projectId: string;
  dayId: string;
  dayNumber: number;
  shots: ProductionDayShot[];
  className?: string;
}

function shotLabel(shot: ProductionDayShot): string {
  const num = shot.scoutShotNumber ?? shot.sortOrder + 1;
  if (shot.shotName?.trim()) return `${num}. ${shot.shotName.trim()}`;
  if (shot.shotType) return `${num}. ${formatShotTypeLabel(shot.shotType)}`;
  return `${num}. Shot`;
}

/** Compact day coverage summary for call sheet — links into Coverage / day shots. */
export function CoverageDayStrip({
  projectId,
  dayId,
  dayNumber,
  shots,
  className,
}: CoverageDayStripProps) {
  const sorted = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);
  const done = sorted.filter((s) => s.done).length;
  const scenes = Array.from(
    new Set(sorted.map((s) => s.sceneRef?.trim()).filter(Boolean) as string[])
  );

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 print:border-slate-300 print:shadow-none",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Coverage for this day</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {sorted.length === 0
              ? "No shots assigned yet."
              : `${done}/${sorted.length} captured${
                  scenes.length ? ` · Scenes ${scenes.join(", ")}` : ""
                }`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={`/projects/${projectId}/coverage`}
            className="text-xs font-medium text-sky-700 hover:underline"
          >
            Open Coverage
          </Link>
          <Link
            href={`/projects/${projectId}/production/days/${dayId}/shots`}
            className="text-xs font-medium text-sky-700 hover:underline"
          >
            Day shot list
          </Link>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 print:hidden">
          Assign shots on{" "}
          <Link
            href={`/projects/${projectId}/coverage`}
            className="font-medium text-sky-700 hover:underline"
          >
            Coverage
          </Link>{" "}
          or the day shot list.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {sorted.slice(0, 12).map((shot) => (
            <li
              key={shot.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  shot.done ? "bg-emerald-500" : "bg-slate-300"
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                {shotLabel(shot)}
              </span>
              {shot.sceneRef ? (
                <span className="shrink-0 text-xs text-slate-500">Sc {shot.sceneRef}</span>
              ) : null}
              {shot.lens ? (
                <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
                  {shot.lens}
                </span>
              ) : null}
            </li>
          ))}
          {sorted.length > 12 && (
            <li className="px-3 py-2 text-xs text-slate-500">
              +{sorted.length - 12} more on Coverage / Day {dayNumber} shot list
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { ProductionDayShot } from "@/lib/production/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { cn } from "@/lib/utils/cn";

interface CoverageDayStripProps {
  projectId: string;
  dayId: string;
  dayNumber: number;
  shots: ProductionDayShot[];
  className?: string;
  /** Max rows before "+N more" (default 16). */
  limit?: number;
}

function shotLabel(shot: ProductionDayShot): string {
  const num = shot.scoutShotNumber ?? shot.sortOrder + 1;
  if (shot.shotName?.trim()) return `${num}. ${shot.shotName.trim()}`;
  if (shot.shotType) return `${num}. ${formatShotTypeLabel(shot.shotType)}`;
  return `${num}. Shot`;
}

function metaBits(shot: ProductionDayShot): string[] {
  const bits: string[] = [];
  if (shot.shotType) bits.push(formatShotTypeLabel(shot.shotType));
  if (shot.lens?.trim()) bits.push(shot.lens.trim());
  if (shot.framing?.trim()) bits.push(shot.framing.trim());
  if (shot.cameraMovement?.trim()) bits.push(shot.cameraMovement.trim());
  return bits;
}

/** Compact day coverage summary for call sheet — thumbs + DP cues, links into Coverage. */
export function CoverageDayStrip({
  projectId,
  dayId,
  dayNumber,
  shots,
  className,
  limit = 16,
}: CoverageDayStripProps) {
  const sorted = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);
  const done = sorted.filter((s) => s.done).length;
  const withFrames = sorted.filter((s) => Boolean(s.referenceImageUrl?.trim())).length;
  const scenes = Array.from(
    new Set(sorted.map((s) => s.sceneRef?.trim()).filter(Boolean) as string[])
  );
  const visible = sorted.slice(0, limit);
  const overflow = sorted.length - visible.length;

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 print:border-slate-300 print:p-3 print:shadow-none",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Coverage for this day</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {sorted.length === 0
              ? "No shots assigned yet."
              : `${done}/${sorted.length} captured · ${withFrames} framed${
                  scenes.length ? ` · Scenes ${scenes.join(", ")}` : ""
                }`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={`/projects/${projectId}/coverage?day=${dayId}`}
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
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 print:divide-slate-200">
          {visible.map((shot) => {
            const bits = metaBits(shot);
            const caption =
              shot.description?.trim() ||
              shot.subjectAction?.trim() ||
              "";
            return (
              <li
                key={shot.id}
                className={cn(
                  "flex items-start gap-3 px-2.5 py-2 text-sm",
                  shot.done && "bg-emerald-50/40"
                )}
              >
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100 print:h-10 print:w-16">
                  {shot.referenceImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.referenceImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                      —
                    </div>
                  )}
                  {shot.done ? (
                    <span className="absolute bottom-0.5 right-0.5 inline-flex rounded bg-emerald-600 p-0.5 text-white">
                      <Check className="h-2.5 w-2.5" aria-label="Captured" />
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-medium text-slate-800">{shotLabel(shot)}</span>
                    {shot.sceneRef ? (
                      <span className="text-xs text-slate-500">Sc {shot.sceneRef}</span>
                    ) : null}
                    {shot.done ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                        Done
                      </span>
                    ) : null}
                  </div>
                  {bits.length > 0 ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{bits.join(" · ")}</p>
                  ) : null}
                  {caption ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-600 print:line-clamp-2">
                      {caption}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
          {overflow > 0 && (
            <li className="px-3 py-2 text-xs text-slate-500">
              +{overflow} more on Coverage / Day {dayNumber} shot list
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

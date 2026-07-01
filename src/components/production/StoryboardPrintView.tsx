"use client";

import { ProductionDay } from "@/lib/production/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";

function sceneTitle(frame: {
  sceneRef: string;
  shotType?: string;
  shotName?: string;
}): string {
  const typeLabel = frame.shotType ? formatShotTypeLabel(frame.shotType) : "Shot";
  const name = frame.shotName?.trim();
  return name ? `Scene ${frame.sceneRef}, ${name}` : `Scene ${frame.sceneRef}, ${typeLabel}`;
}

export function StoryboardPrintView({
  projectName,
  boardTitle,
  day,
}: {
  projectName: string;
  boardTitle?: string;
  day: ProductionDay;
}) {
  const frames = [...(day.sceneFrames ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const title = boardTitle || projectName;

  return (
    <div className="text-sm text-slate-900">
      <div className="mb-4 rounded bg-orange-700 px-4 py-2 text-center text-white">
        <p className="text-[10px] font-semibold uppercase tracking-widest">Project</p>
        <h1 className="text-base font-bold uppercase">{title}</h1>
        <p className="text-xs opacity-90">
          Storyboard — Day {day.dayNumber}
          {day.shootDate ? ` · ${day.shootDate}` : ""}
        </p>
      </div>

      {frames.length === 0 ? (
        <p className="text-slate-500">No storyboard frames.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {frames.map((frame) => (
            <div key={frame.id} className="break-inside-avoid border border-slate-300">
              <div className="aspect-[4/3] bg-slate-100">
                {frame.referenceImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={frame.referenceImageUrl}
                    alt={sceneTitle(frame)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No reference image
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-bold text-orange-800">{sceneTitle(frame)}</p>
                {frame.caption && (
                  <p className="mt-1 text-[11px] leading-snug text-slate-800">{frame.caption}</p>
                )}
                {frame.audioCue && (
                  <p className="mt-1 text-[10px] italic text-slate-600">{frame.audioCue}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

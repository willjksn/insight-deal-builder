"use client";

import { ProductionDay } from "@/lib/production/types";
import {
  formatProductionShotLabel,
  formatShotTypeLabel,
} from "@/lib/production/shotLabels";
import { templateLabel } from "@/lib/production/sceneCoverageChecklist";
import { cn } from "@/lib/utils/cn";

export function ShotListPrintView({
  projectName,
  boardTitle,
  day,
}: {
  projectName: string;
  boardTitle?: string;
  day: ProductionDay;
}) {
  const sorted = [...day.shots].sort((a, b) => a.sortOrder - b.sortOrder);
  const checklists = day.coverageChecklists ?? [];

  return (
    <div className="text-sm text-slate-900">
      <h1 className="text-lg font-bold">
        Day shots — Day {day.dayNumber}
        {day.title && day.title !== `Day ${day.dayNumber}` ? `: ${day.title}` : ""}
      </h1>
      <p className="text-slate-600">
        {boardTitle || projectName}
        {day.shootDate ? ` · ${day.shootDate}` : ""}
      </p>

      {checklists.length > 0 ? (
        <div className="mt-4 space-y-3">
          {checklists.map((checklist) => {
            const doneCount = checklist.items.filter((i) => i.done).length;
            return (
              <div key={checklist.sceneRef} className="break-inside-avoid">
                <h2 className="text-sm font-semibold">
                  Required coverage — Scene {checklist.sceneRef}
                  <span className="ml-2 font-normal text-slate-500">
                    {doneCount}/{checklist.items.length} · {templateLabel(checklist.templateId)}
                  </span>
                </h2>
                {checklist.sceneHeading ? (
                  <p className="text-xs text-slate-500">{checklist.sceneHeading}</p>
                ) : null}
                <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  {checklist.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-1.5">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded border",
                          item.done ? "border-emerald-700 bg-emerald-100" : "border-slate-400"
                        )}
                      />
                      <span className={item.done ? "text-slate-500 line-through" : ""}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="mt-4 text-slate-500">No shots listed.</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-[10px] uppercase">
              <th className="py-2 pr-2 w-8">✓</th>
              <th className="py-2 pr-2 w-8">#</th>
              <th className="py-2 pr-2 w-12">Sc.</th>
              <th className="py-2 pr-2 w-24">Type</th>
              <th className="py-2">Shot</th>
              <th className="py-2 pl-2 w-24">Movement</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((shot) => (
              <tr key={shot.id} className="border-b border-slate-200 align-top">
                <td className="py-2 pr-2">
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded border",
                      shot.done ? "border-emerald-600" : "border-slate-400"
                    )}
                  />
                </td>
                <td className="py-2 pr-2">{shot.scoutShotNumber ?? "—"}</td>
                <td className="py-2 pr-2">{shot.sceneRef ?? "—"}</td>
                <td className="py-2 pr-2">{formatShotTypeLabel(shot.shotType)}</td>
                <td className="py-2">
                  {formatProductionShotLabel(shot)}
                  {shot.notes ? (
                    <div className="mt-0.5 whitespace-pre-wrap text-slate-500">{shot.notes}</div>
                  ) : null}
                </td>
                <td className="py-2 pl-2">{shot.cameraMovement ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

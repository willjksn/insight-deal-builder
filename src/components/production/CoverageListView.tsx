"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { ProductionDayShot } from "@/lib/production/types";
import {
  formatShotTypeLabel,
  SHOT_TYPE_LABELS,
} from "@/lib/production/shotLabels";
import type { CoverageShotRow } from "@/components/production/CoverageBoardView";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

const SHOT_TYPE_OPTIONS = Object.keys(SHOT_TYPE_LABELS);

interface CoverageListViewProps {
  shots: CoverageShotRow[];
  readOnly?: boolean;
  defaultDayId?: string;
  onPatchShot: (dayId: string, shotId: string, patch: Partial<ProductionDayShot>) => void;
  onAddShot?: (dayId: string) => void;
  onRemoveShot?: (dayId: string, shotId: string) => void;
  className?: string;
}

export function CoverageListView({
  shots,
  readOnly,
  defaultDayId,
  onPatchShot,
  onAddShot,
  onRemoveShot,
  className,
}: CoverageListViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...shots].sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return a.sortOrder - b.sortOrder;
  });
  const doneCount = sorted.filter((s) => s.done).length;

  return (
    <section
      className={cn("rounded-2xl border border-slate-200 bg-white p-5", className)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Coverage list</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            DP-style shot bible — expand a row for lens, framing, blocking, and lighting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tabular-nums text-sky-700">
            {doneCount}/{sorted.length} captured
          </span>
          {!readOnly && onAddShot && defaultDayId && (
            <Button type="button" size="sm" variant="outline" onClick={() => onAddShot(defaultDayId)}>
              <Plus className="mr-1 h-4 w-4" />
              Add shot
            </Button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">No shots yet. Apply a script or add a shot.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="w-8 py-2" />
                <th className="w-10 py-2 pr-2">Done</th>
                <th className="w-12 py-2 pr-2">Day</th>
                <th className="w-12 py-2 pr-2">#</th>
                <th className="w-16 py-2 pr-2">Scene</th>
                <th className="w-36 py-2 pr-2">Type</th>
                <th className="min-w-[10rem] py-2 pr-2">Shot</th>
                <th className="min-w-[9rem] py-2 pr-2">Movement</th>
                <th className="min-w-[7rem] py-2 pr-2">Lens</th>
                {!readOnly && <th className="w-10 py-2" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((shot) => {
                const open = expandedId === shot.id;
                return (
                  <Fragment key={`${shot.dayId}-${shot.id}`}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 align-middle",
                        shot.done && "bg-emerald-50/40"
                      )}
                    >
                      <td className="py-2 pr-1">
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => setExpandedId(open ? null : shot.id)}
                          aria-label={open ? "Collapse" : "Expand"}
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={shot.done}
                          disabled={readOnly}
                          onChange={(e) =>
                            onPatchShot(shot.dayId, shot.id, { done: e.target.checked })
                          }
                        />
                      </td>
                      <td className="py-2 pr-2 tabular-nums text-slate-600">{shot.dayNumber}</td>
                      <td className="py-2 pr-2 tabular-nums text-slate-600">
                        {shot.scoutShotNumber ?? shot.sortOrder + 1}
                      </td>
                      <td className="py-2 pr-2">
                        {readOnly ? (
                          shot.sceneRef || "—"
                        ) : (
                          <Input
                            value={shot.sceneRef ?? ""}
                            className="h-8 min-w-[3.5rem] px-2 py-1 text-sm"
                            onChange={(e) =>
                              onPatchShot(shot.dayId, shot.id, { sceneRef: e.target.value })
                            }
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {readOnly ? (
                          shot.shotType ? formatShotTypeLabel(shot.shotType) : "—"
                        ) : (
                          <select
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"
                            value={shot.shotType ?? "medium_shot"}
                            onChange={(e) =>
                              onPatchShot(shot.dayId, shot.id, { shotType: e.target.value })
                            }
                          >
                            {SHOT_TYPE_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {formatShotTypeLabel(t)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {readOnly ? (
                          shot.shotName || shot.label
                        ) : (
                          <Input
                            value={shot.shotName ?? ""}
                            placeholder="Shot name"
                            className="h-8 px-2 py-1 text-sm"
                            onChange={(e) =>
                              onPatchShot(shot.dayId, shot.id, {
                                shotName: e.target.value,
                                label: e.target.value
                                  ? `${shot.scoutShotNumber ?? shot.sortOrder + 1}. ${e.target.value}`
                                  : shot.label,
                              })
                            }
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {readOnly ? (
                          shot.cameraMovement || "—"
                        ) : (
                          <Input
                            value={shot.cameraMovement ?? ""}
                            placeholder="Movement"
                            className="h-8 px-2 py-1 text-sm"
                            onChange={(e) =>
                              onPatchShot(shot.dayId, shot.id, {
                                cameraMovement: e.target.value,
                              })
                            }
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {readOnly ? (
                          shot.lens || "—"
                        ) : (
                          <Input
                            value={shot.lens ?? ""}
                            placeholder="e.g. 35mm"
                            className="h-8 px-2 py-1 text-sm"
                            onChange={(e) =>
                              onPatchShot(shot.dayId, shot.id, { lens: e.target.value })
                            }
                          />
                        )}
                      </td>
                      {!readOnly && onRemoveShot && (
                        <td className="py-2">
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => onRemoveShot(shot.dayId, shot.id)}
                            aria-label="Remove shot"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                    {open && (
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <td colSpan={readOnly ? 9 : 10} className="px-4 py-3">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {(
                              [
                                ["description", "What we see", shot.description],
                                ["subjectAction", "Action", shot.subjectAction],
                                ["framing", "Framing", shot.framing],
                                ["cameraHeight", "Height", shot.cameraHeight],
                                ["blocking", "Blocking", shot.blocking],
                                ["lighting", "Lighting", shot.lighting],
                                ["support", "Support", shot.support],
                                ["audioCue", "Audio cue", shot.audioCue],
                                ["setupNotes", "Setup", shot.setupNotes],
                              ] as const
                            ).map(([key, label, value]) => (
                              <label key={key} className="block text-xs">
                                <span className="mb-1 block font-medium text-slate-500">{label}</span>
                                {readOnly ? (
                                  <span className="text-sm text-slate-700">{value || "—"}</span>
                                ) : (
                                  <Input
                                    value={value ?? ""}
                                    className="h-9 px-2 py-1 text-sm"
                                    onChange={(e) =>
                                      onPatchShot(shot.dayId, shot.id, {
                                        [key]: e.target.value,
                                      } as Partial<ProductionDayShot>)
                                    }
                                  />
                                )}
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductionDayShot } from "@/lib/production/types";
import {
  formatProductionShotLabel,
  formatShotTypeLabel,
  SHOT_TYPE_LABELS,
} from "@/lib/production/shotLabels";
import { PRODUCTION_SHOT_DRAG_MIME } from "@/components/production/ProductionDayNav";
import { cn } from "@/lib/utils/cn";

const SHOT_TYPE_OPTIONS = Object.keys(SHOT_TYPE_LABELS);

export type ShotMoveDayOption = {
  id: string;
  dayNumber: number;
  title: string;
};

interface ProductionShotListEditorProps {
  shots: ProductionDayShot[];
  onChange: (shots: ProductionDayShot[]) => void;
  readOnly?: boolean;
  className?: string;
  currentDayId?: string;
  otherDays?: ShotMoveDayOption[];
  onMoveToDay?: (shotId: string, targetDayId: string) => void;
  onDragStateChange?: (shotId: string | null) => void;
  draggingShotId?: string | null;
}

export function ProductionShotListEditor({
  shots,
  onChange,
  readOnly,
  className,
  currentDayId,
  otherDays = [],
  onMoveToDay,
  onDragStateChange,
  draggingShotId,
}: ProductionShotListEditorProps) {
  const sorted = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);
  const doneCount = sorted.filter((s) => s.done).length;
  const canMove = !readOnly && otherDays.length > 0 && onMoveToDay;

  const update = (id: string, patch: Partial<ProductionDayShot>) => {
    onChange(shots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addShot = () => {
    onChange([
      ...shots,
      {
        id: crypto.randomUUID(),
        label: "New shot",
        done: false,
        sortOrder: shots.length,
        shotType: "medium_shot",
      },
    ]);
  };

  return (
    <section
      id="shots"
      className={cn("scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5", className)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Shot list</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Drag the grip handle to another day tab, or use Move to… when weather or schedule
            changes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tabular-nums text-sky-700">
            {doneCount}/{sorted.length} shot
            {sorted.length === 1 ? "" : "s"}
          </span>
          {!readOnly && (
            <Button type="button" size="sm" variant="outline" onClick={addShot}>
              <Plus className="mr-1 h-4 w-4" />
              Add shot
            </Button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">
          No shots on this day. Drag shots here from another day, or add manually.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                {!readOnly && <th className="w-8 py-2" />}
                <th className="w-10 py-2 pr-2">Done</th>
                <th className="w-12 py-2 pr-2">#</th>
                <th className="w-16 py-2 pr-2">Scene</th>
                <th className="w-36 py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Shot</th>
                <th className="w-28 py-2 pr-2">Movement</th>
                {canMove && <th className="w-28 py-2 pr-2">Move</th>}
                {!readOnly && <th className="w-10 py-2" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((shot) => (
                <tr
                  key={shot.id}
                  className={cn(
                    "border-b border-slate-100 align-top transition-colors",
                    shot.done && "bg-emerald-50/40",
                    draggingShotId === shot.id && "opacity-50 bg-sky-50"
                  )}
                >
                  {!readOnly && (
                    <td className="py-2 pr-1">
                      <button
                        type="button"
                        draggable
                        className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                        aria-label={`Drag shot ${shot.scoutShotNumber ?? ""} to another day`}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(PRODUCTION_SHOT_DRAG_MIME, shot.id);
                          e.dataTransfer.effectAllowed = "move";
                          onDragStateChange?.(shot.id);
                        }}
                        onDragEnd={() => onDragStateChange?.(null)}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={shot.done}
                      disabled={readOnly}
                      onChange={(e) => update(shot.id, { done: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                      aria-label={`Mark shot ${shot.scoutShotNumber ?? ""} complete`}
                    />
                  </td>
                  <td className="py-2 pr-2 tabular-nums text-slate-600">
                    {shot.scoutShotNumber ?? "—"}
                  </td>
                  <td className="py-2 pr-2 text-slate-600">{shot.sceneRef ?? "—"}</td>
                  <td className="py-2 pr-2">
                    {readOnly ? (
                      <span className="text-slate-700">{formatShotTypeLabel(shot.shotType)}</span>
                    ) : (
                      <select
                        value={shot.shotType ?? "medium_shot"}
                        onChange={(e) =>
                          update(shot.id, {
                            shotType: e.target.value,
                            label: buildLabel({
                              ...shot,
                              shotType: e.target.value,
                            }),
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                      >
                        {SHOT_TYPE_OPTIONS.map((key) => (
                          <option key={key} value={key}>
                            {SHOT_TYPE_LABELS[key as keyof typeof SHOT_TYPE_LABELS]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="space-y-1.5">
                      <Input
                        value={
                          shot.shotName ??
                          formatProductionShotLabel(shot).replace(/^\d+\.\s*/, "")
                        }
                        disabled={readOnly}
                        onChange={(e) =>
                          update(shot.id, {
                            shotName: e.target.value,
                            label: buildLabel({ ...shot, shotName: e.target.value }),
                          })
                        }
                        placeholder="Shot name / description"
                        className="text-sm"
                      />
                      {shot.subjectAction && (
                        <p className="text-xs text-slate-500">{shot.subjectAction}</p>
                      )}
                      {shot.notes && <p className="text-xs text-slate-400">{shot.notes}</p>}
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={shot.cameraMovement ?? ""}
                      disabled={readOnly}
                      onChange={(e) => update(shot.id, { cameraMovement: e.target.value })}
                      placeholder="Static"
                      className="text-xs"
                    />
                  </td>
                  {canMove && (
                    <td className="py-2 pr-2">
                      <select
                        value=""
                        onChange={(e) => {
                          const target = e.target.value;
                          if (target && target !== currentDayId) {
                            onMoveToDay!(shot.id, target);
                          }
                          e.target.value = "";
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        aria-label="Move shot to another day"
                      >
                        <option value="">Move to…</option>
                        {otherDays.map((d) => (
                          <option key={d.id} value={d.id}>
                            Day {d.dayNumber}
                            {d.title && d.title !== `Day ${d.dayNumber}` ? `: ${d.title}` : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {!readOnly && (
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-500"
                        onClick={() => onChange(shots.filter((s) => s.id !== shot.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function buildLabel(shot: ProductionDayShot): string {
  const num = shot.scoutShotNumber;
  const name =
    shot.shotName?.trim() ||
    formatShotTypeLabel(shot.shotType) +
      (shot.subjectAction ? ` — ${shot.subjectAction.slice(0, 48)}` : "");
  return num ? `${num}. ${name}` : name;
}

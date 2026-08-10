"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  computeCompletionStats,
  type ChecklistItem,
  type ContentPlan,
  type ContentPlanGenerateSection,
  type ContentShot,
  type CoverageItem,
  type CoveragePlan,
  type ShootChecklist,
  type ShootOrderPlan,
  type ShotStatus,
} from "@/lib/contentPlan/types";
import { cn } from "@/lib/utils/cn";

function SectionHeader({
  title,
  busy,
  onRegen,
  section,
}: {
  title: string;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
  section: ContentPlanGenerateSection;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => onRegen(section)}
      >
        Regenerate
      </Button>
    </div>
  );
}

function EmptyPhase3({
  label,
  hint,
  busy,
  onRegen,
}: {
  label: string;
  hint: string;
  busy: boolean;
  onRegen: () => void;
}) {
  return (
    <div className="space-y-3 py-6 text-center">
      <p className="font-medium text-slate-900">{label} not generated yet</p>
      <p className="text-sm text-slate-600">{hint}</p>
      <Button type="button" size="sm" disabled={busy} onClick={onRegen}>
        Generate {label}
      </Button>
    </div>
  );
}

export function CompletionBar({ plan }: { plan: ContentPlan }) {
  const stats = useMemo(() => computeCompletionStats(plan), [plan]);
  if (!plan.shots?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {stats.completedShots} / {stats.totalShots} shots
        </span>
        <span className="text-slate-600">Coverage {stats.coveragePercent}%</span>
        <span className="text-slate-600">
          Critical left: {stats.criticalRemaining}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1",
            stats.pickups > 0 ? "font-medium text-amber-800" : "text-slate-600"
          )}
        >
          {stats.pickups > 0 ? <TriangleAlert className="h-3.5 w-3.5" /> : null}
          Pickups: {stats.pickups}
        </span>
      </div>
    </div>
  );
}

function CoverageItemRow({
  item,
  onToggle,
}: {
  item: CoverageItem;
  onToggle: (id: string, status: CoverageItem["status"]) => void;
}) {
  const captured = item.status === "captured";
  return (
    <label className="flex items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={captured}
        onChange={() =>
          onToggle(item.id, captured ? (item.critical ? "missing" : "planned") : "captured")
        }
      />
      <span className="min-w-0">
        <span className="font-medium text-slate-900">{item.label}</span>
        {item.critical ? (
          <span className="ml-1 text-[10px] font-semibold uppercase text-rose-700">
            critical
          </span>
        ) : null}
        {item.why ? <p className="mt-0.5 text-xs text-slate-600">{item.why}</p> : null}
      </span>
    </label>
  );
}

export function CoveragePanel({
  coveragePlan,
  busy,
  onRegen,
  onUpdate,
}: {
  coveragePlan?: CoveragePlan | null;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
  onUpdate: (next: CoveragePlan) => void;
}) {
  if (!coveragePlan) {
    return (
      <EmptyPhase3
        label="Coverage"
        hint="Generate coverage requirements, missing angles, and wrap pickups."
        busy={busy}
        onRegen={() => onRegen("coverage")}
      />
    );
  }

  function patchItem(id: string, status: CoverageItem["status"]) {
    const mapItems = (items: CoverageItem[]) =>
      items.map((i) => (i.id === id ? { ...i, status } : i));
    onUpdate({
      ...coveragePlan!,
      planned: mapItems(coveragePlan!.planned),
      missing: mapItems(coveragePlan!.missing),
      moments: coveragePlan!.moments.map((m) => ({
        ...m,
        required: mapItems(m.required),
        optional: mapItems(m.optional),
      })),
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Coverage check" busy={busy} onRegen={onRegen} section="coverage" />
      {coveragePlan.overview ? (
        <p className="text-sm text-slate-700">{coveragePlan.overview}</p>
      ) : null}

      {coveragePlan.warnings?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            Warnings
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-amber-950">
            {coveragePlan.warnings.map((w, i) => (
              <li key={`w-${i}`}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {coveragePlan.moments.map((m) => (
        <div key={m.id} className="rounded-xl border border-slate-200 px-3 py-3">
          <p className="font-medium text-slate-900">{m.title}</p>
          {m.description ? (
            <p className="mt-1 text-sm text-slate-600">{m.description}</p>
          ) : null}
          {m.required.length ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                Required
              </p>
              {m.required.map((item) => (
                <CoverageItemRow key={item.id} item={item} onToggle={patchItem} />
              ))}
            </div>
          ) : null}
          {m.optional.length ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Optional
              </p>
              {m.optional.map((item) => (
                <CoverageItemRow key={item.id} item={item} onToggle={patchItem} />
              ))}
            </div>
          ) : null}
        </div>
      ))}

      {coveragePlan.planned.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Planned / available
          </p>
          <div className="mt-2 space-y-1.5">
            {coveragePlan.planned.map((item) => (
              <CoverageItemRow key={item.id} item={item} onToggle={patchItem} />
            ))}
          </div>
        </div>
      ) : null}

      {coveragePlan.missing.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">
            Missing / recommended
          </p>
          <div className="mt-2 space-y-1.5">
            {coveragePlan.missing.map((item) => (
              <CoverageItemRow key={item.id} item={item} onToggle={patchItem} />
            ))}
          </div>
        </div>
      ) : null}

      {coveragePlan.pickupsBeforeWrap?.length ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">
            Recommended pickups before wrap
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-800">
            {coveragePlan.pickupsBeforeWrap.map((p, i) => (
              <li key={`pu-${i}`}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ShootOrderPanel({
  shootOrderPlan,
  busy,
  onRegen,
}: {
  shootOrderPlan?: ShootOrderPlan | null;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
}) {
  if (!shootOrderPlan) {
    return (
      <EmptyPhase3
        label="Shoot Order"
        hint="Generate story order vs efficient production order."
        busy={busy}
        onRegen={() => onRegen("shoot_order")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Shoot order"
        busy={busy}
        onRegen={onRegen}
        section="shoot_order"
      />
      {shootOrderPlan.efficiencyReason ? (
        <p className="text-sm text-slate-700">{shootOrderPlan.efficiencyReason}</p>
      ) : null}
      {typeof shootOrderPlan.setupChangeCount === "number" ? (
        <p className="text-xs font-medium text-slate-600">
          Estimated setup changes: {shootOrderPlan.setupChangeCount}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <OrderList title="Story order" items={shootOrderPlan.storyOrder} />
        <OrderList title="Shoot order" items={shootOrderPlan.shootOrder} accent />
      </div>

      {shootOrderPlan.groupingNotes?.length ? (
        <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
          {shootOrderPlan.groupingNotes.map((n, i) => (
            <li key={`gn-${i}`}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OrderList({
  title,
  items,
  accent,
}: {
  title: string;
  items: ShootOrderPlan["storyOrder"];
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        accent ? "border-sky-200 bg-sky-50/50" : "border-slate-200 bg-white"
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <ol className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={`${title}-${item.shotId}-${i}`} className="text-sm text-slate-800">
            <span className="font-semibold text-sky-800">{i + 1}.</span>{" "}
            <span className="font-medium">
              Shot {String(item.shotNumber).padStart(2, "0")}
            </span>{" "}
            {item.shotName}
            {item.groupLabel ? (
              <span className="ml-1 text-xs text-slate-500">({item.groupLabel})</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ChecklistPanel({
  checklist,
  busy,
  onRegen,
  onUpdate,
}: {
  checklist?: ShootChecklist | null;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
  onUpdate: (next: ShootChecklist) => void;
}) {
  if (!checklist) {
    return (
      <EmptyPhase3
        label="Checklist"
        hint="Generate before-shoot / before-move / before-wrap checklists."
        busy={busy}
        onRegen={() => onRegen("checklist")}
      />
    );
  }

  function toggle(group: keyof ShootChecklist, id: string) {
    const next: ShootChecklist = {
      beforeShooting: checklist!.beforeShooting.map((i) =>
        group === "beforeShooting" && i.id === id ? { ...i, done: !i.done } : i
      ),
      beforeMovingCamera: checklist!.beforeMovingCamera.map((i) =>
        group === "beforeMovingCamera" && i.id === id ? { ...i, done: !i.done } : i
      ),
      beforeWrap: checklist!.beforeWrap.map((i) =>
        group === "beforeWrap" && i.id === id ? { ...i, done: !i.done } : i
      ),
    };
    onUpdate(next);
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Shoot-day checklist" busy={busy} onRegen={onRegen} section="checklist" />
      <CheckGroup
        title="Before shooting"
        items={checklist.beforeShooting}
        onToggle={(id) => toggle("beforeShooting", id)}
      />
      <CheckGroup
        title="Before moving camera"
        items={checklist.beforeMovingCamera}
        onToggle={(id) => toggle("beforeMovingCamera", id)}
      />
      <CheckGroup
        title="Before wrap"
        items={checklist.beforeWrap}
        onToggle={(id) => toggle("beforeWrap", id)}
      />
    </div>
  );
}

function CheckGroup({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: ChecklistItem[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={item.done}
                onChange={() => onToggle(item.id)}
              />
              <span className={cn(item.done && "text-slate-500 line-through")}>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_OPTIONS: { value: ShotStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "ready", label: "Ready" },
  { value: "shooting", label: "Shooting" },
  { value: "completed", label: "Completed" },
  { value: "needs_pickup", label: "Needs pickup" },
  { value: "dropped", label: "Dropped" },
];

const DEFAULT_COVERAGE_CHECKS = ["Master", "CU", "Insert", "Safety"];

export function ShootModePanel({
  plan,
  onUpdateShots,
  largeControls = false,
}: {
  plan: ContentPlan;
  onUpdateShots: (shots: ContentShot[]) => void;
  /** Bigger touch targets for the dedicated on-set Shoot Mode page. */
  largeControls?: boolean;
}) {
  const orderedIds =
    plan.shootOrderPlan?.shootOrder?.map((s) => s.shotId) ||
    plan.shots.map((s) => s.id);
  const shotsById = new Map(plan.shots.map((s) => [s.id, s]));
  const ordered = orderedIds
    .map((id) => shotsById.get(id))
    .filter((s): s is ContentShot => Boolean(s));
  const list = ordered.length ? ordered : plan.shots;

  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(list.length - 1, 0));
  const shot = list[safeIndex];
  if (!shot) {
    return <p className="py-6 text-center text-sm text-slate-600">No shots yet.</p>;
  }

  const takes = shot.takesRecommended || 3;
  const completed = new Set(shot.takesCompleted || []);
  const checks = shot.coverageChecks || {};
  const doneCount = list.filter((s) => s.status === "completed").length;

  function patchShot(partial: Partial<ContentShot>) {
    onUpdateShots(
      plan.shots.map((s) => (s.id === shot.id ? { ...s, ...partial } : s))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
            Shoot mode · {safeIndex + 1}/{list.length} · {doneCount} done
          </p>
          <h4 className="text-lg font-semibold text-slate-900">
            Shot {String(shot.shotNumber).padStart(2, "0")} — {shot.shotName}
          </h4>
        </div>
        <ClipboardList className="h-5 w-5 text-slate-400" />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {list.map((s, i) => {
          const done = s.status === "completed";
          const active = i === safeIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700"
              )}
              title={s.shotName}
            >
              S{String(s.shotNumber).padStart(2, "0")}
            </button>
          );
        })}
      </div>

      {shot.referenceImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot.referenceImageUrl}
          alt={`Reference for ${shot.shotName}`}
          className="max-h-48 w-full rounded-xl border border-slate-200 object-contain"
        />
      ) : null}

      {(shot.transitionOut || shot.speedRampNotes) && (
        <p className="text-sm text-slate-600">
          {[
            shot.transitionOut && `Out: ${shot.transitionOut}`,
            shot.speedRampNotes && `Speed: ${shot.speedRampNotes}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <label className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-medium text-emerald-950">
        <input
          type="checkbox"
          checked={shot.status === "completed"}
          onChange={(e) =>
            patchShot({ status: e.target.checked ? "completed" : "shooting" })
          }
        />
        Shot completed
      </label>

      <div className="grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
        <p>
          <span className="text-slate-500">Lens:</span>{" "}
          {shot.lens || shot.focalLength || "—"}
        </p>
        <p>
          <span className="text-slate-500">FPS:</span> {shot.frameRate || "—"}
        </p>
        <p>
          <span className="text-slate-500">Camera:</span> {shot.cameraBody || "—"}
        </p>
        <p>
          <span className="text-slate-500">Move:</span> {shot.movement || "—"}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Status
        </p>
        <Select
          value={shot.status}
          onChange={(e) => patchShot({ status: e.target.value as ShotStatus })}
          options={STATUS_OPTIONS}
        />
      </div>

      {shot.setDesignIdeas || shot.setDressing?.length ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            Set design
          </p>
          {shot.setDesignIdeas ? (
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">
              {shot.setDesignIdeas}
            </p>
          ) : null}
          {shot.setDressing?.length ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-800">
              {shot.setDressing.map((item, i) => (
                <li key={`${shot.id}-sm-dress-${i}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">
          How to shoot
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-800">
          {(shot.howToShoot?.steps || []).slice(0, 8).map((s, i) => (
            <li key={`${shot.id}-sm-${i}`}>{s}</li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Coverage
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {DEFAULT_COVERAGE_CHECKS.map((label) => (
            <label key={label} className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={Boolean(checks[label])}
                onChange={(e) =>
                  patchShot({
                    coverageChecks: { ...checks, [label]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Takes
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {Array.from({ length: takes }, (_, i) => i + 1).map((n) => (
            <label key={n} className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={completed.has(n)}
                onChange={(e) => {
                  const next = new Set(completed);
                  if (e.target.checked) next.add(n);
                  else next.delete(n);
                  patchShot({ takesCompleted: [...next].sort((a, b) => a - b) });
                }}
              />
              Take {n}
            </label>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Notes
        </span>
        <textarea
          value={shot.shootNotes || ""}
          onChange={(e) => patchShot({ shootNotes: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
          placeholder="On-set notes…"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size={largeControls ? "touch" : "sm"}
          className={largeControls ? "flex-1" : undefined}
          disabled={index <= 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Prev
        </Button>
        <Button
          type="button"
          size={largeControls ? "touch" : "sm"}
          className={largeControls ? "flex-1" : undefined}
          disabled={index >= list.length - 1}
          onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
        >
          Next shot
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Phase3SummaryActions({
  plan,
  busy,
  onRegen,
}: {
  plan: ContentPlan;
  busy: boolean;
  onRegen: (section: ContentPlanGenerateSection) => void;
}) {
  const missing =
    !plan.coveragePlan || !plan.shootOrderPlan || !plan.checklist;
  if (!missing) return null;
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 text-sm">
      <p className="text-slate-800">
        Phase 3 adds coverage checks, shoot order, checklist, and Shoot Mode tracking.
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-2"
        disabled={busy || !plan.shots?.length}
        onClick={() => onRegen("phase3")}
      >
        Generate Phase 3
      </Button>
    </div>
  );
}

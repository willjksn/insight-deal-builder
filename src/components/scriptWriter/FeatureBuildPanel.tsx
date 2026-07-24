"use client";

import { Check, CircleDashed, Clapperboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeatureBuildState } from "@/lib/scriptWriter/types";

interface FeatureBuildPanelProps {
  build: FeatureBuildState | null | undefined;
  building?: boolean;
  step?: string | null;
  onBuild?: () => void;
}

function StepRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5 text-slate-400" />
      )}
      <span className={done ? "text-slate-700" : "text-slate-500"}>{label}</span>
    </li>
  );
}

export function FeatureBuildPanel({ build, building, step, onBuild }: FeatureBuildPanelProps) {
  const outline = build?.outline ?? null;
  const totalActs = outline?.acts.length ?? build?.totalActs ?? 4;
  const doneActs = new Set((build?.acts ?? []).map((a) => a.index));
  const assembled = build?.status === "assembled";

  const label = !outline ? "Build feature" : assembled ? "Rebuild feature" : "Resume build";

  return (
    <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-slate-900">Feature build</h3>
          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700/80">
            Multi-pass · ~{totalActs + 1} AI runs
          </span>
        </div>
        {onBuild ? (
          <Button size="sm" variant="outline" disabled={building} onClick={onBuild}>
            {building ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clapperboard className="mr-1.5 h-3.5 w-3.5" />
            )}
            {label}
          </Button>
        ) : null}
      </div>

      {building && step ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          {step}
        </p>
      ) : null}

      {outline ? (
        <ol className="mt-3 space-y-1 text-xs">
          <StepRow done label={`Outline — logline, characters, ${outline.acts.length}-act beat sheet`} />
          {outline.acts.map((act, i) => (
            <StepRow key={i} done={doneActs.has(i)} label={`Act ${i + 1}: ${act.title}`} />
          ))}
          <StepRow done={assembled} label="Assemble full screenplay" />
        </ol>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Writes a full-length script in stages — outline → each act with continuity carried forward →
          final assembly. Runs a handful of short AI passes so nothing truncates, and it&apos;s
          resumable if a pass fails.
        </p>
      )}
    </div>
  );
}

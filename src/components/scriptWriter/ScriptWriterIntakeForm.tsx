"use client";

import { ReactNode } from "react";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_SCRIPT_BRIEF,
  SCRIPT_AUDIENCE_AGE_LABELS,
  SCRIPT_CAST_SIZE_LABELS,
  SCRIPT_CONTENT_TYPE_LABELS,
  SCRIPT_GENDER_MIX_LABELS,
  SCRIPT_MOOD_LABELS,
  SCRIPT_RUNTIME_LABELS,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";

interface ScriptWriterIntakeFormProps {
  brief: ScriptWriterBrief;
  onChange: (brief: ScriptWriterBrief) => void;
  researchTrends?: boolean;
  onResearchTrendsChange?: (value: boolean) => void;
}

function selectOptions<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({
    value,
    label,
  }));
}

const fieldSelectClass =
  "border-slate-200/80 bg-white text-sm shadow-none focus:border-violet-300 focus:ring-violet-300/20";

function DefaultFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </span>
  );
}

function SelectWithCustomSlot({
  label,
  value,
  customValue,
  onSelectChange,
  onCustomChange,
  options,
  customPlaceholder,
  showCustom,
}: {
  label: string;
  value: string;
  customValue?: string;
  onSelectChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  options: { value: string; label: string }[];
  customPlaceholder: string;
  showCustom: boolean;
}) {
  const selectId = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      <DefaultFieldLabel>{label}</DefaultFieldLabel>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onSelectChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2",
          fieldSelectClass
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="mt-1.5 h-9">
        {showCustom ? (
          <input
            value={customValue ?? ""}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder={customPlaceholder}
            aria-label={`${label} — custom value`}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300/20"
          />
        ) : (
          <div className="h-9" aria-hidden />
        )}
      </div>
    </div>
  );
}

export function ScriptWriterIntakeForm({
  brief,
  onChange,
  researchTrends,
  onResearchTrendsChange,
}: ScriptWriterIntakeFormProps) {
  const patch = (partial: Partial<ScriptWriterBrief>) => onChange({ ...brief, ...partial });

  return (
    <div className="space-y-5">
      <Textarea
        label="Story idea"
        value={brief.concept}
        onChange={(e) => patch({ concept: e.target.value })}
        placeholder="A founder films a product launch in a warehouse studio, but the first take keeps getting interrupted…"
        rows={4}
      />
      <Textarea
        label="Character notes (optional)"
        value={brief.characterNotes ?? ""}
        onChange={(e) => patch({ characterNotes: e.target.value })}
        placeholder="Names, ages, casting — only if you already know them"
        rows={2}
      />

      <div className="border-t border-slate-100 pt-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Settings</p>
        <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <DefaultFieldLabel>Type</DefaultFieldLabel>
            <Select
              value={brief.contentType}
              onChange={(e) =>
                patch({ contentType: e.target.value as ScriptWriterBrief["contentType"] })
              }
              options={selectOptions(SCRIPT_CONTENT_TYPE_LABELS)}
              className={fieldSelectClass}
            />
            <div className="h-[42px]" aria-hidden />
          </div>

          <SelectWithCustomSlot
            label="Mood / tone"
            value={brief.mood}
            customValue={brief.customMood}
            showCustom={brief.mood === "custom"}
            options={selectOptions(SCRIPT_MOOD_LABELS)}
            customPlaceholder="e.g. noir, nostalgic 90s…"
            onSelectChange={(mood) =>
              patch({
                mood: mood as ScriptWriterBrief["mood"],
                customMood: mood === "custom" ? brief.customMood : undefined,
              })
            }
            onCustomChange={(customMood) => patch({ customMood })}
          />

          <div>
            <DefaultFieldLabel>People on camera</DefaultFieldLabel>
            <Select
              value={brief.castSize}
              onChange={(e) =>
                patch({ castSize: e.target.value as ScriptWriterBrief["castSize"] })
              }
              options={selectOptions(SCRIPT_CAST_SIZE_LABELS)}
              className={fieldSelectClass}
            />
            <div className="h-[42px]" aria-hidden />
          </div>

          <SelectWithCustomSlot
            label="Runtime"
            value={brief.runtime}
            customValue={brief.customRuntime}
            showCustom={brief.runtime === "custom"}
            options={selectOptions(SCRIPT_RUNTIME_LABELS)}
            customPlaceholder="e.g. 45 seconds, 4 minutes…"
            onSelectChange={(runtime) =>
              patch({
                runtime: runtime as ScriptWriterBrief["runtime"],
                customRuntime: runtime === "custom" ? brief.customRuntime : undefined,
              })
            }
            onCustomChange={(customRuntime) => patch({ customRuntime })}
          />

          <div>
            <DefaultFieldLabel>Audience age</DefaultFieldLabel>
            <Select
              value={brief.audienceAge}
              onChange={(e) =>
                patch({ audienceAge: e.target.value as ScriptWriterBrief["audienceAge"] })
              }
              options={selectOptions(SCRIPT_AUDIENCE_AGE_LABELS)}
              className={fieldSelectClass}
            />
            <div className="h-[42px]" aria-hidden />
          </div>

          <div>
            <DefaultFieldLabel>On-camera gender mix</DefaultFieldLabel>
            <Select
              value={brief.genderMix}
              onChange={(e) =>
                patch({ genderMix: e.target.value as ScriptWriterBrief["genderMix"] })
              }
              options={selectOptions(SCRIPT_GENDER_MIX_LABELS)}
              className={fieldSelectClass}
            />
            <div className="h-[42px]" aria-hidden />
          </div>
        </div>
      </div>

      {onResearchTrendsChange ? (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={researchTrends ?? false}
              onChange={(e) => onResearchTrendsChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Research current trends</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Uses the weekly trend cache when fresh (under 7 days), or Tavily live on refresh.
                Requires <code className="text-[10px]">TAVILY_API_KEY</code> on the server.
              </span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

export { DEFAULT_SCRIPT_BRIEF };

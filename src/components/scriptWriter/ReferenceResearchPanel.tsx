"use client";

import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScriptReferenceResearch } from "@/lib/scriptWriter/types";

interface ReferenceResearchPanelProps {
  references: ScriptReferenceResearch | null | undefined;
  loading?: boolean;
  onResearch?: () => void;
  compact?: boolean;
}

function LabeledList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ReferenceResearchPanel({
  references,
  loading,
  onResearch,
  compact,
}: ReferenceResearchPanelProps) {
  if (!references && !onResearch) return null;

  return (
    <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/40 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-slate-900">Comparable films</h3>
          <span className="text-[10px] font-medium uppercase tracking-wide text-violet-700/80">
            Craft patterns · Tavily + Gemini
          </span>
        </div>
        {onResearch ? (
          <Button size="sm" variant="outline" disabled={loading} onClick={onResearch}>
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Film className="mr-1.5 h-3.5 w-3.5" />
            )}
            {references ? "Refresh" : "Find references"}
          </Button>
        ) : null}
      </div>

      {references ? (
        <div className={`mt-3 space-y-2 text-sm text-slate-700 ${compact ? "text-xs" : ""}`}>
          <p>{references.summary}</p>
          {references.comparableTitles.length > 0 ? (
            <p className="text-xs text-slate-500">
              <span className="font-semibold uppercase">Comparable:</span>{" "}
              {references.comparableTitles.join(", ")}
            </p>
          ) : null}
          <LabeledList label="Structure" items={references.structure} />
          {!compact ? <LabeledList label="Tone & dynamics" items={references.tone} /> : null}
          {!compact ? <LabeledList label="Visual language" items={references.visualLanguage} /> : null}
          <LabeledList label="Lean into" items={references.emulate} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Optional — pull craft patterns (structure, tone, visual language) from comparable works to
          focus the script. Inspiration only, never copied.
        </p>
      )}
    </div>
  );
}

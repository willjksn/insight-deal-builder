"use client";

import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScriptTrendsResearch } from "@/lib/scriptWriter/types";

interface TrendsResearchPanelProps {
  trends: ScriptTrendsResearch | null | undefined;
  loading?: boolean;
  onResearch?: () => void;
  compact?: boolean;
}

export function TrendsResearchPanel({
  trends,
  loading,
  onResearch,
  compact,
}: TrendsResearchPanelProps) {
  if (!trends && !onResearch) return null;

  return (
    <div className="mb-4 rounded-xl border border-sky-200/80 bg-sky-50/40 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-900">Trend research</h3>
          <span className="text-[10px] font-medium uppercase tracking-wide text-sky-700/80">
            {trends?.source === "live" ? "Live Tavily" : "Weekly cache · Tavily + Gemini"}
          </span>
        </div>
        {onResearch ? (
          <Button size="sm" variant="outline" disabled={loading} onClick={onResearch}>
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="mr-1.5 h-3.5 w-3.5" />
            )}
            {trends ? "Live refresh" : "Research trends"}
          </Button>
        ) : null}
      </div>

      {trends ? (
        <div className={`mt-3 space-y-2 text-sm text-slate-700 ${compact ? "text-xs" : ""}`}>
          <p>{trends.summary}</p>
          {trends.hooks.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Hooks</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {trends.hooks.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {!compact && trends.pacingNotes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Pacing</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {trends.pacingNotes.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Optional — pull in what&apos;s working now for this format before writing.
        </p>
      )}
    </div>
  );
}

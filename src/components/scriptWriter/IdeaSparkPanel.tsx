"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { scriptWriterSparkIdeas } from "@/lib/scriptWriter/apiClient";
import { ScriptWriterBrief } from "@/lib/scriptWriter/brief";
import { ScriptIdeaSuggestion } from "@/lib/scriptWriter/types";

interface IdeaSparkPanelProps {
  brief: ScriptWriterBrief;
  onApply: (idea: ScriptIdeaSuggestion) => void;
}

export function IdeaSparkPanel({ brief, onApply }: IdeaSparkPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ScriptIdeaSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usedTrends, setUsedTrends] = useState(false);
  const [appliedTitle, setAppliedTitle] = useState<string | null>(null);

  const fetchIdeas = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await scriptWriterSparkIdeas(() => user.getIdToken(), {
        contentType: brief.contentType,
        mood: brief.mood,
        customMood: brief.customMood,
        castSize: brief.castSize,
        runtime: brief.runtime,
        customRuntime: brief.customRuntime,
        audienceAge: brief.audienceAge,
        genderMix: brief.genderMix,
        genre: brief.genre,
        setting: brief.setting,
        theme: brief.theme,
        concept: brief.concept,
        spicyMode: brief.spicyMode,
      });
      setIdeas(res.ideas);
      setUsedTrends(res.usedTrends);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate ideas. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200/70 bg-violet-50/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <span className="font-medium text-violet-900">No idea yet?</span>
          <span className="text-xs text-slate-500">
            Get fresh, trend-aware concepts for this format.
          </span>
        </div>
        <button
          type="button"
          onClick={() => void fetchIdeas()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" />
              {ideas.length ? "More ideas" : "Inspire me"}
            </>
          )}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}

      {ideas.length ? (
        <div className="mt-3 space-y-2">
          {usedTrends ? (
            <p className="text-[11px] font-medium uppercase tracking-wide text-violet-500">
              Informed by current trends
            </p>
          ) : null}
          <ul className="space-y-2">
            {ideas.map((idea, i) => {
              const applied = appliedTitle === idea.title;
              return (
                <li
                  key={`${idea.title}-${i}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{idea.title}</p>
                      <p className="mt-0.5 text-sm text-slate-700">{idea.logline}</p>
                      {idea.angle ? (
                        <p className="mt-1 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">Angle:</span> {idea.angle}
                        </p>
                      ) : null}
                      {idea.whyItWorks ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">Why it works:</span>{" "}
                          {idea.whyItWorks}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onApply(idea);
                        setAppliedTitle(idea.title);
                      }}
                      className={
                        applied
                          ? "shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          : "shrink-0 rounded-lg border border-violet-300 bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                      }
                    >
                      {applied ? "Added ✓" : "Use this"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

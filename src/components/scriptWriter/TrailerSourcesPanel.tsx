"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/scriptWriter/CollapsibleSection";
import {
  scriptWriterGetTrailerSources,
  scriptWriterSaveTrailerSources,
} from "@/lib/scriptWriter/apiClient";
import {
  ScriptTrailerSourceEntry,
  SCRIPT_SERIES_ENTRY_KIND_LABELS,
} from "@/lib/scriptWriter/series/types";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";

interface TrailerSourcesPanelProps {
  sessionId: string;
  getToken: () => Promise<string | null>;
  onSaved: (session: ScriptWriterSession) => void;
  readOnly?: boolean;
  className?: string;
}

const keyOf = (sessionId: string, sceneNumber: string) => `${sessionId}::${sceneNumber}`;

export function TrailerSourcesPanel({
  sessionId,
  getToken,
  onSaved,
  readOnly,
  className,
}: TrailerSourcesPanelProps) {
  const [entries, setEntries] = useState<ScriptTrailerSourceEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    scriptWriterGetTrailerSources(getToken, sessionId)
      .then((res) => {
        setEntries(res.entries);
        const sel = new Set(res.selected.map((r) => keyOf(r.sessionId, r.sceneNumber)));
        setSelected(sel);
        setInitial(new Set(sel));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load source scenes"))
      .finally(() => setLoading(false));
  }, [getToken, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (sid: string, sceneNumber: string) => {
    if (readOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const k = keyOf(sid, sceneNumber);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const dirty = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const k of selected) if (!initial.has(k)) return true;
    return false;
  }, [selected, initial]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const sources = [...selected].map((k) => {
        const [s, scene] = k.split("::");
        return { sessionId: s, sceneNumber: scene };
      });
      const res = await scriptWriterSaveTrailerSources(getToken, sessionId, sources);
      onSaved(res.session as ScriptWriterSession);
      setInitial(new Set(selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const totalAvailable = entries.reduce((n, e) => n + e.scenes.length, 0);

  return (
    <div className={`mb-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <Clapperboard className="h-4 w-4" />
            Trailer source scenes
          </h3>
          <p className="mt-0.5 text-xs text-violet-700">
            Pick scenes from other entries in this series. When you generate, the trailer is
            assembled from the selected material — not invented.
          </p>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save ({selected.size})
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading scenes…</p>
        ) : totalAvailable === 0 ? (
          <p className="text-sm text-slate-500">
            No source scenes yet. Write at least one other entry (episode) in this series first.
          </p>
        ) : (
          entries.map((entry) => {
            const label = `${SCRIPT_SERIES_ENTRY_KIND_LABELS[entry.entryKind]} ${entry.order} · ${entry.title}`;
            const pickedHere = entry.scenes.filter((s) =>
              selected.has(keyOf(entry.sessionId, s.sceneNumber))
            ).length;
            return (
              <CollapsibleSection
                key={entry.sessionId}
                title={`${label}${pickedHere ? ` — ${pickedHere} picked` : ""}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <ul className="space-y-1.5">
                  {entry.scenes.map((s) => {
                    const k = keyOf(entry.sessionId, s.sceneNumber);
                    return (
                      <li key={k}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.has(k)}
                            disabled={readOnly}
                            onChange={() => toggle(entry.sessionId, s.sceneNumber)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-slate-800">
                              Scene {s.sceneNumber}: {s.heading}
                            </span>
                            {s.action ? (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                                {s.action}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleSection>
            );
          })
        )}
      </div>
    </div>
  );
}

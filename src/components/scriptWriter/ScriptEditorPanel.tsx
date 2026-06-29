"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  scriptWriterListScriptVersions,
  scriptWriterRestoreScriptVersion,
  scriptWriterSaveScript,
} from "@/lib/scriptWriter/apiClient";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { ScriptVersionRecord, scriptVersionLabel } from "@/lib/scriptWriter/scriptVersionLabels";
import { ScriptProductionPackView } from "@/components/scriptWriter/ScriptProductionPackView";

interface ScriptEditorPanelProps {
  sessionId: string;
  script: ScriptDocument;
  getToken: () => Promise<string | null>;
  onUpdated: (script: ScriptDocument) => void;
  readOnly?: boolean;
}

export function ScriptEditorPanel({
  sessionId,
  script,
  getToken,
  onUpdated,
  readOnly,
}: ScriptEditorPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(script);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<ScriptVersionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(script);
  }, [script, editing]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { versions: list } = await scriptWriterListScriptVersions(getToken, sessionId);
      setVersions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken, sessionId]);

  useEffect(() => {
    if (showHistory) void loadHistory();
  }, [showHistory, loadHistory]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { session } = await scriptWriterSaveScript(getToken, sessionId, {
        title: draft.title,
        logline: draft.logline,
        lookAndFeel: draft.lookAndFeel,
        references: draft.references,
        idealRuntime: draft.idealRuntime,
        genre: draft.genre,
        fountain: draft.fountain,
      });
      const updated = (session as { script: ScriptDocument }).script;
      onUpdated(updated);
      setEditing(false);
      if (showHistory) await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const restore = async (versionId: string) => {
    if (!window.confirm("Replace the current script with this version?")) return;
    setRestoring(versionId);
    setError(null);
    try {
      const { session } = await scriptWriterRestoreScriptVersion(getToken, sessionId, versionId);
      const updated = (session as { script: ScriptDocument }).script;
      onUpdated(updated);
      setEditing(false);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <>
            {editing ? (
              <>
                <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save edits
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setDraft(script);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit script
              </Button>
            )}
          </>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowHistory((v) => !v)}
        >
          <History className="mr-1.5 h-4 w-4" />
          {showHistory ? "Hide history" : "Version history"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {showHistory && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved versions</p>
          {historyLoading ? (
            <p className="mt-2 text-sm text-slate-500">Loading…</p>
          ) : versions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No prior versions yet — edits and AI runs create snapshots.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {scriptVersionLabel(v.source, v.label)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {v.title ? `${v.title} · ` : ""}
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoring === v.id}
                      onClick={() => void restore(v.id)}
                    >
                      {restoring === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restore"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <Input
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Textarea
            label="Logline"
            value={draft.logline}
            onChange={(e) => setDraft({ ...draft, logline: e.target.value })}
            rows={2}
          />
          <Textarea
            label="Look & feel"
            value={draft.lookAndFeel ?? ""}
            onChange={(e) => setDraft({ ...draft, lookAndFeel: e.target.value })}
            rows={2}
          />
          <Textarea
            label="Screenplay (Fountain)"
            value={draft.fountain}
            onChange={(e) => setDraft({ ...draft, fountain: e.target.value })}
            rows={16}
            className="font-mono text-xs"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900">{script.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{script.logline}</p>
          </div>
          <ScriptProductionPackView script={script} />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Screenplay</h4>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
              {script.fountain}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

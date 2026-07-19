"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ScreenplayEditor } from "@/components/screenplay/ScreenplayEditor";
import {
  ScreenplayPreview,
  ScreenplayPreviewControls,
  useScreenplayPreviewState,
} from "@/components/screenplay/ScreenplayPreview";
import { ScreenplayExportMenu } from "@/components/screenplay/ScreenplayExportMenu";
import {
  applyElementsToScript,
  getScriptElements,
  normalizeScriptDocument,
} from "@/lib/screenplay/normalize";
import { cn } from "@/lib/utils/cn";

interface ScriptEditorPanelProps {
  sessionId: string;
  script: ScriptDocument;
  getToken: () => Promise<string | null>;
  onUpdated: (script: ScriptDocument) => void;
  readOnly?: boolean;
}

type ScriptViewMode = "preview" | "edit";

function EditActionButtons({
  saving,
  onSave,
  onCancel,
  className,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button type="button" size="sm" disabled={saving} onClick={onSave}>
        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
        Save edits
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export function ScriptEditorPanel({
  sessionId,
  script,
  getToken,
  onUpdated,
  readOnly,
}: ScriptEditorPanelProps) {
  const normalizedScript = useMemo(() => normalizeScriptDocument(script), [script]);
  /** Editor-first: open in Edit when the user can change the script. */
  const [viewMode, setViewMode] = useState<ScriptViewMode>(readOnly ? "preview" : "edit");
  const [editing, setEditing] = useState(!readOnly);
  const [draft, setDraft] = useState(normalizedScript);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<ScriptVersionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const previewState = useScreenplayPreviewState(editing ? draft : normalizedScript);

  useEffect(() => {
    if (!editing) setDraft(normalizeScriptDocument(script));
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
      const next = normalizeScriptDocument(draft);
      const { session } = await scriptWriterSaveScript(getToken, sessionId, {
        title: next.title,
        logline: next.logline,
        author: next.author,
        draftLabel: next.draftLabel,
        lookAndFeel: next.lookAndFeel,
        references: next.references,
        idealRuntime: next.idealRuntime,
        genre: next.genre,
        fountain: next.fountain,
        elements: next.elements,
        scenes: next.scenes,
        characters: next.characters,
        showPageOneNumber: next.showPageOneNumber,
      });
      const updated = normalizeScriptDocument((session as { script: ScriptDocument }).script);
      onUpdated(updated);
      setEditing(false);
      setViewMode("preview");
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
      const updated = normalizeScriptDocument((session as { script: ScriptDocument }).script);
      onUpdated(updated);
      setEditing(false);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  const cancelEdit = () => {
    setDraft(normalizedScript);
    setEditing(false);
    setViewMode("preview");
  };

  const activeScript = editing ? draft : normalizedScript;
  const elements = getScriptElements(activeScript);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {(["preview", "edit"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setViewMode(mode);
                if (mode === "edit" && !readOnly) setEditing(true);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize",
                viewMode === mode ? "bg-sky-600 text-white" : "text-slate-600"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        {!readOnly && editing ? (
          <EditActionButtons
            saving={saving}
            onSave={() => void save()}
            onCancel={cancelEdit}
          />
        ) : !readOnly ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(true);
              setViewMode("edit");
            }}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit script
          </Button>
        ) : null}

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

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {showHistory ? (
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
                  {!readOnly ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoring === v.id}
                      onClick={() => void restore(v.id)}
                    >
                      {restoring === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restore"}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900">{activeScript.title}</h3>
            <p className="mt-1 break-words text-sm text-slate-600">{activeScript.logline}</p>
          </div>

          {editing ? (
            <div className="space-y-3">
              <Input
                label="Title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              <Input
                label="Author"
                value={draft.author ?? ""}
                onChange={(e) => setDraft({ ...draft, author: e.target.value })}
              />
              <Input
                label="Draft label"
                value={draft.draftLabel ?? ""}
                onChange={(e) => setDraft({ ...draft, draftLabel: e.target.value })}
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
            </div>
          ) : null}

          <ScriptProductionPackView script={activeScript} />
          <ScreenplayExportMenu
            script={activeScript}
            showNotes={previewState.showNotes}
            showPageOneNumber={previewState.showPageOneNumber}
          />
        </div>

        <div className="min-w-0 space-y-3">
          <ScreenplayPreviewControls
            zoom={previewState.zoom}
            onZoomChange={previewState.setZoom}
            showNotes={previewState.showNotes}
            onShowNotesChange={previewState.setShowNotes}
            showPageOneNumber={previewState.showPageOneNumber}
            onShowPageOneNumberChange={previewState.setShowPageOneNumber}
          />

          {viewMode === "edit" && editing ? (
            <ScreenplayEditor
              elements={elements}
              onChange={(nextElements) => {
                setDraft(applyElementsToScript(draft, nextElements));
              }}
            />
          ) : (
            <ScreenplayPreview
              script={{
                ...activeScript,
                showPageOneNumber: previewState.showPageOneNumber,
              }}
              showNotes={previewState.showNotes}
              showPageOneNumber={previewState.showPageOneNumber}
              zoom={previewState.zoom}
            />
          )}

          {!readOnly && editing ? (
            <EditActionButtons
              saving={saving}
              onSave={() => void save()}
              onCancel={cancelEdit}
              className="border-t border-slate-100 pt-4"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  scriptWriterAttachToSeries,
  scriptWriterDetachFromSeries,
  scriptWriterListSeries,
} from "@/lib/scriptWriter/apiClient";
import {
  ScriptSeries,
  ScriptSeriesEntryKind,
  SCRIPT_SERIES_ENTRY_KIND_LABELS,
} from "@/lib/scriptWriter/series/types";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";

interface AddToSeriesButtonProps {
  sessionId: string;
  getToken: () => Promise<string | null>;
  seriesId?: string;
  seriesEntryKind?: ScriptSeriesEntryKind;
  onChanged: (session: ScriptWriterSession) => void;
}

export function AddToSeriesButton({
  sessionId,
  getToken,
  seriesId,
  seriesEntryKind,
  onChanged,
}: AddToSeriesButtonProps) {
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<ScriptSeries[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [entryKind, setEntryKind] = useState<ScriptSeriesEntryKind>(
    seriesEntryKind ?? "episode"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(() => {
    setLoadingList(true);
    scriptWriterListSeries(getToken)
      .then((res) => setSeries(res.series))
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => setLoadingList(false));
  }, [getToken]);

  // Keep a copy of the list so we can show the current series title on the trigger.
  useEffect(() => {
    loadList();
  }, [loadList]);

  const currentTitle = series.find((s) => s.id === seriesId)?.title;

  const openDialog = () => {
    setError(null);
    setSelectedId(seriesId ?? "");
    setEntryKind(seriesEntryKind ?? "episode");
    setMode(series.length > 0 ? "existing" : "new");
    if (series.length === 0) loadList();
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "new"
          ? { newSeriesTitle: newTitle.trim(), entryKind }
          : { seriesId: selectedId, entryKind };
      if (mode === "new" && !newTitle.trim()) throw new Error("Enter a series name");
      if (mode === "existing" && !selectedId) throw new Error("Pick a series");
      const res = await scriptWriterAttachToSeries(getToken, sessionId, body);
      onChanged(res.session as ScriptWriterSession);
      setNewTitle("");
      loadList();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to series");
    } finally {
      setSubmitting(false);
    }
  };

  const detach = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await scriptWriterDetachFromSeries(getToken, sessionId);
      onChanged(res.session as ScriptWriterSession);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove from series");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button type="button" size="touch" variant="outline" onClick={openDialog}>
        <Clapperboard className="mr-2 h-5 w-5" />
        {seriesId ? `Series: ${currentTitle ?? "…"}` : "Add to series"}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900">
              {seriesId ? "Change series" : "Add to a series"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Tag this script as an entry so it shares the series canon and continuity.
            </p>

            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-4 space-y-4">
              {/* Existing / new toggle */}
              <div
                className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "existing"}
                  onClick={() => setMode("existing")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "existing"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Existing series
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "new"}
                  onClick={() => setMode("new")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "new"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  New series
                </button>
              </div>

              {mode === "existing" ? (
                <Select
                  label="Series"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={loadingList}
                  options={[
                    {
                      value: "",
                      label: loadingList ? "Loading series…" : "Select a series…",
                    },
                    ...series.map((s) => ({ value: s.id, label: s.title })),
                  ]}
                />
              ) : (
                <Input
                  label="New series name"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. The Gaze"
                />
              )}

              <Select
                label="Entry type"
                value={entryKind}
                onChange={(e) => setEntryKind(e.target.value as ScriptSeriesEntryKind)}
                options={(
                  Object.keys(SCRIPT_SERIES_ENTRY_KIND_LABELS) as ScriptSeriesEntryKind[]
                ).map((k) => ({ value: k, label: SCRIPT_SERIES_ENTRY_KIND_LABELS[k] }))}
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              {seriesId ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  disabled={submitting}
                  onClick={() => void detach()}
                >
                  Remove from series
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={submitting} onClick={() => void submit()}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {seriesId ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

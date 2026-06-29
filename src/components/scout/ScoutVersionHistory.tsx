"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  scoutFetchHistory,
  scoutRestoreHistory,
} from "@/lib/scout/apiClient";
import { ScoutHistoryEntry } from "@/lib/scout/scoutHistoryLabels";
import { ScoutHistoryKind } from "@/lib/scout/scoutHistoryLabels";
import { scoutHistoryLabel } from "@/lib/scout/scoutHistoryLabels";

interface ScoutVersionHistoryProps {
  scoutId: string;
  kind: ScoutHistoryKind;
  onRestored: () => void;
  readOnly?: boolean;
}

export function ScoutVersionHistory({
  scoutId,
  kind,
  onRestored,
  readOnly,
}: ScoutVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ScoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scoutFetchHistory(scoutId, kind);
      setEntries(data.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [scoutId, kind]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const restore = async (documentId: string) => {
    if (!window.confirm("Replace the current version with this snapshot?")) return;
    setRestoring(documentId);
    try {
      await scoutRestoreHistory(scoutId, kind, documentId);
      onRestored();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="border-t border-slate-100 p-4">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        <History className="mr-1.5 h-4 w-4" />
        {open ? "Hide history" : "Version history"}
      </Button>
      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {error && (
            <p className="mb-2 text-sm text-red-700">{error}</p>
          )}
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-500">No saved versions yet.</p>
          ) : (
            <ul className="max-h-52 space-y-2 overflow-y-auto">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{scoutHistoryLabel(entry)}</p>
                    <p className="text-xs text-slate-500">
                      {entry.summary ? `${entry.summary} · ` : ""}
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoring === entry.id}
                      onClick={() => void restore(entry.id)}
                    >
                      {restoring === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Restore"
                      )}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

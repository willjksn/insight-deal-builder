"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronUp, Folder, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DEFAULT_AGENT_BASE_URL } from "@/lib/aiEditor/agentProtocol";
import { agentListDir, agentListDrives } from "@/lib/aiEditor/agentClient";
import type { AgentDriveEntry, AgentFsEntry } from "@/lib/aiEditor/agentProtocol";

const HIDDEN_FOLDER_NAMES = new Set(
  [
    "$recycle.bin",
    "system volume information",
    "recovery",
    "perflogs",
    "program files",
    "program files (x86)",
    "programdata",
    "windows",
    "windows.old",
    "documents and settings",
    "config.msi",
    "msocache",
    "intel",
    "amd",
    "nvidia",
    "boot",
    "efi",
    // Windows junction stubs under Documents — use real Videos/Music/Pictures instead
    "my videos",
    "my music",
    "my pictures",
    "my documents",
    "application data",
    "local settings",
    "cookies",
    "nethood",
    "printhood",
    "recent",
    "sendto",
    "templates",
    "start menu",
    ".shootspine-thumbs",
    ".shootspine-proxies",
  ].map((s) => s.toLowerCase())
);

function isWindowsCRoot(path: string): boolean {
  return /^[cC]:\\?$/.test(path.trim());
}

/** Starters people actually pick for footage — not the whole C: dump. */
function usefulStarters(drives: AgentDriveEntry[]): AgentDriveEntry[] {
  const preferredKinds = new Set(["videos", "desktop", "documents", "home"]);
  const out: AgentDriveEntry[] = [];
  const seen = new Set<string>();

  for (const d of drives) {
    if (preferredKinds.has(d.kind)) {
      const key = d.path.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(d);
      }
    }
  }
  for (const d of drives) {
    if (d.kind !== "drive") continue;
    if (isWindowsCRoot(d.path)) continue; // C:\ is confusing — use Videos / Home instead
    const key = d.path.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ ...d, label: d.label.includes(":") ? `Drive ${d.label}` : d.label });
    }
  }
  return out;
}

function friendlyStarterLabel(d: AgentDriveEntry): string {
  if (d.kind === "videos") return "Videos";
  if (d.kind === "desktop") return "Desktop";
  if (d.kind === "documents") return "Documents";
  if (d.kind === "home") return "Your user folder";
  if (d.kind === "drive") return d.label.startsWith("Drive") ? d.label : `Drive ${d.label}`;
  return d.label;
}

function filterBrowsableFolders(entries: AgentFsEntry[], parentPath: string): AgentFsEntry[] {
  const atCRoot = isWindowsCRoot(parentPath);
  return entries.filter((e) => {
    if (e.kind !== "dir") return false;
    const name = e.name.toLowerCase();
    if (name.startsWith(".")) return false;
    if (HIDDEN_FOLDER_NAMES.has(name)) return false;
    if (atCRoot) {
      // At C:\ only show common useful top-level dirs
      return ["users", "shootspine", "shootspine_projects", "media", "video", "videos"].includes(
        name
      );
    }
    return true;
  });
}

type Props = {
  label: string;
  value: string;
  onChange: (path: string) => void;
  getAgentToken: () => Promise<string>;
  agentConnected: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Shown under the label */
  hint?: string;
};

export function FolderPicker({
  label,
  value,
  onChange,
  getAgentToken,
  agentConnected,
  disabled,
  placeholder,
  hint,
}: Props) {
  const [drives, setDrives] = useState<AgentDriveEntry[]>([]);
  const [browsePath, setBrowsePath] = useState("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<AgentFsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const starters = useMemo(() => usefulStarters(drives), [drives]);
  const folders = useMemo(
    () => filterBrowsableFolders(entries, browsePath),
    [entries, browsePath]
  );

  const loadDrives = useCallback(async () => {
    if (!agentConnected) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAgentToken();
      const res = await agentListDrives(DEFAULT_AGENT_BASE_URL, token);
      setDrives(res.drives);
      return res.drives;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not list folders");
      return [] as AgentDriveEntry[];
    } finally {
      setLoading(false);
    }
  }, [agentConnected, getAgentToken]);

  const loadDir = useCallback(
    async (dirPath: string) => {
      if (!agentConnected || !dirPath.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const token = await getAgentToken();
        const res = await agentListDir(DEFAULT_AGENT_BASE_URL, token, dirPath);
        setBrowsePath(res.path);
        setParentPath(res.parentPath);
        setEntries(res.entries);
        onChange(res.path);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not open folder";
        if (/EPERM|EACCES|blocked that folder|My Videos/i.test(msg)) {
          setError(
            "That folder can’t be opened (Windows blocks Documents\\My Videos). Choose Videos, Desktop, or an external drive instead."
          );
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [agentConnected, getAgentToken, onChange]
  );

  useEffect(() => {
    if (!open || !agentConnected) return;
    void (async () => {
      const list = drives.length ? drives : (await loadDrives()) || [];
      const useful = usefulStarters(list);
      const startFrom =
        value.trim() ||
        useful.find((d) => d.kind === "videos")?.path ||
        useful.find((d) => d.kind === "home")?.path ||
        useful[0]?.path;
      if (startFrom && !browsePath) {
        await loadDir(startFrom);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once
  }, [open, agentConnected]);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </div>

      {value ? (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200/80 bg-sky-50/60 px-3 py-2.5">
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-sky-900">Selected folder</div>
            <div className="truncate text-sm text-slate-800" title={value}>
              {value}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-sm text-slate-500">
          No folder selected yet
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || !agentConnected}
          onClick={() => setOpen((v) => !v)}
        >
          <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
          {open ? "Close picker" : "Choose folder"}
        </Button>
        <button
          type="button"
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide path field" : "Paste a path instead"}
        </button>
      </div>

      {showAdvanced ? (
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {!agentConnected ? (
        <p className="text-xs text-amber-800">Connect this computer first (step 1), then choose a folder.</p>
      ) : null}

      {open && agentConnected ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4">
          {error ? <p className="text-xs text-red-700">{error}</p> : null}

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start here
            </div>
            <div className="flex flex-wrap gap-2">
              {starters.map((d) => (
                <button
                  key={`${d.kind}:${d.path}`}
                  type="button"
                  disabled={disabled || loading}
                  onClick={() => void loadDir(d.path)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-900 disabled:opacity-50"
                >
                  {friendlyStarterLabel(d)}
                </button>
              ))}
              {!starters.length && !loading ? (
                <span className="text-xs text-slate-500">No suggested locations found</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || loading || !parentPath}
              onClick={() => parentPath && void loadDir(parentPath)}
            >
              <ChevronUp className="mr-1 h-3.5 w-3.5" />
              Back
            </Button>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500" title={browsePath}>
              {browsePath || "Pick a starting place above"}
            </span>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Folders inside
            </div>
            {folders.length === 0 && !loading ? (
              <p className="text-sm text-slate-500">
                No useful subfolders here. Use “Use this folder” if this is the right place.
              </p>
            ) : (
              <div className="grid max-h-56 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {folders.map((e) => (
                  <button
                    key={e.path}
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => void loadDir(e.path)}
                    className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-200 hover:bg-white disabled:opacity-50"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-sky-600" />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            disabled={disabled || !browsePath}
            onClick={() => {
              if (browsePath) {
                onChange(browsePath);
                setOpen(false);
              }
            }}
          >
            Use this folder
          </Button>
        </div>
      ) : null}
    </div>
  );
}

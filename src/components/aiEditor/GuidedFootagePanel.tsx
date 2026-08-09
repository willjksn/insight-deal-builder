"use client";

import { HardDrive, Loader2, MemoryStick, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/aiEditor/checksum";
import type { DetectedMediaSource } from "@/lib/aiEditor/cameraDetectors/types";
import type { GuidedCameraPlan, GuidedWorkspacePlan } from "@/lib/aiEditor/guidedWorkspace";
import type { IngestDestinationDriveOption } from "@/lib/aiEditor/storageDrives";

type PendingFile = { path: string; filename: string; sizeBytes: number };

type Props = {
  agentConnected: boolean;
  scanning: boolean;
  busy: boolean;
  busyCopying: boolean;
  projectName: string;
  cameraPlan: GuidedCameraPlan | null;
  workspacePlan: GuidedWorkspacePlan | null;
  destinationDrives: IngestDestinationDriveOption[];
  selectedDriveRoot: string | null;
  onSelectDriveRoot: (root: string) => void;
  sources: DetectedMediaSource[];
  selectedSourceId: string | null;
  onSelectSource: (id: string) => void;
  pendingFiles: PendingFile[] | null;
  selectedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onSelectAllPending: () => void;
  onSelectNonePending: () => void;
  mediaCount: number;
  progressLabel?: string | null;
  onRescan: () => void;
  onPrepareAndReview: () => void;
  onCopyFootage: () => void;
  onUseRecommendedDrive: () => void;
};

export function GuidedFootagePanel({
  agentConnected,
  scanning,
  busy,
  busyCopying,
  projectName,
  cameraPlan,
  workspacePlan,
  destinationDrives,
  selectedDriveRoot,
  onSelectDriveRoot,
  sources,
  selectedSourceId,
  onSelectSource,
  pendingFiles,
  selectedPaths,
  onTogglePath,
  onSelectAllPending,
  onSelectNonePending,
  mediaCount,
  progressLabel,
  onRescan,
  onPrepareAndReview,
  onCopyFootage,
  onUseRecommendedDrive,
}: Props) {
  const disabled = busy || !agentConnected;
  const selectedBytes = pendingFiles
    ? pendingFiles
        .filter((f) => selectedPaths.has(f.path))
        .reduce((s, f) => s + (f.sizeBytes || 0), 0)
    : cameraPlan?.source.totalBytes || 0;
  const selectedCount = pendingFiles
    ? pendingFiles.filter((f) => selectedPaths.has(f.path)).length
    : cameraPlan?.source.clipCount || 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white px-4 py-4 shadow-sm shadow-sky-100/40">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold text-slate-900">Get footage into this project</p>
            <p className="text-sm text-slate-600">
              ShootSpine picks your camera card and SSD. Files stay on your drives — nothing
              uploads to the cloud.
            </p>
          </div>
        </div>
      </div>

      {!agentConnected ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Connect this computer in step 1 first.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <MemoryStick className="h-3.5 w-3.5" />
            From
          </div>
          {scanning ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking for camera cards…
            </p>
          ) : cameraPlan ? (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-slate-900">{cameraPlan.title}</p>
              <p className="text-xs text-slate-500">{cameraPlan.detail}</p>
              {sources.length > 1 ? (
                <label className="mt-2 block text-xs text-slate-600">
                  Source
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-800"
                    value={selectedSourceId || cameraPlan.source.id}
                    disabled={disabled}
                    onChange={(e) => onSelectSource(e.target.value)}
                  >
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.probableCameraModel || s.label || s.mountPath) +
                          ` · ${s.clipCount} clips`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              No camera card found. Plug in the card/reader, then Rescan.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <HardDrive className="h-3.5 w-3.5" />
            Save to
          </div>
          {workspacePlan ? (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-slate-900">{workspacePlan.driveLabel}</p>
              <p className="break-all font-mono text-[11px] text-slate-500">
                {workspacePlan.projectRoot}
              </p>
              {workspacePlan.shouldMigrate ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
                  You’re on This PC right now. Use your SSD for a real shoot.
                  <button
                    type="button"
                    className="ml-1 font-semibold underline"
                    disabled={disabled}
                    onClick={onUseRecommendedDrive}
                  >
                    Switch to SSD
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Plug in an external SSD (T7), then Rescan.
            </p>
          )}
          {destinationDrives.length > 1 ? (
            <label className="mt-2 block text-xs text-slate-600">
              Drive
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-800"
                value={selectedDriveRoot || workspacePlan?.driveRoot || ""}
                disabled={disabled}
                onChange={(e) => onSelectDriveRoot(e.target.value)}
              >
                {destinationDrives.map((d) => (
                  <option key={d.rootPath} value={d.rootPath}>
                    {d.label}
                    {d.freeBytes != null ? ` · ${formatBytes(d.freeBytes)} free` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {pendingFiles?.length ? (
        <div className="space-y-2 rounded-2xl border border-sky-200 bg-sky-50/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">
              Clips to copy ({selectedPaths.size} of {pendingFiles.length}) ·{" "}
              {formatBytes(selectedBytes)}
            </p>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className="font-medium text-sky-800 underline disabled:opacity-50"
                disabled={disabled}
                onClick={onSelectAllPending}
              >
                All
              </button>
              <button
                type="button"
                className="font-medium text-sky-800 underline disabled:opacity-50"
                disabled={disabled}
                onClick={onSelectNonePending}
              >
                None
              </button>
            </div>
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white bg-white/90 p-2">
            {pendingFiles.map((f) => (
              <li key={f.path}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(f.path)}
                    disabled={disabled}
                    onChange={() => onTogglePath(f.path)}
                  />
                  <span className="min-w-0 flex-1 truncate">{f.filename}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatBytes(f.sizeBytes || 0)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {progressLabel ? (
        <p className="text-sm font-medium text-sky-900">{progressLabel}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onCopyFootage}
          disabled={
            disabled ||
            !cameraPlan ||
            !workspacePlan ||
            (pendingFiles != null && selectedCount === 0)
          }
        >
          {busyCopying ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <HardDrive className="mr-1.5 h-4 w-4" />
          )}
          {pendingFiles?.length
            ? `Copy ${selectedCount} clip${selectedCount === 1 ? "" : "s"}`
            : "Copy footage"}
        </Button>
        <Button
          variant="secondary"
          onClick={onPrepareAndReview}
          disabled={disabled || !cameraPlan}
        >
          {busy && !busyCopying ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : null}
          Review clips first
        </Button>
        <Button variant="ghost" onClick={onRescan} disabled={disabled}>
          {scanning ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}
          Rescan
        </Button>
        {mediaCount > 0 ? (
          <Badge variant="success">{mediaCount} in project</Badge>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Project: <span className="font-medium text-slate-700">{projectName}</span>
        {" · "}
        Previews are prepared automatically while copying.
      </p>
    </div>
  );
}

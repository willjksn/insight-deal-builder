"use client";

import { HardDrive, Loader2, MemoryStick, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/aiEditor/checksum";
import type { DetectedMediaSource } from "@/lib/aiEditor/cameraDetectors/detectMediaSource";
import {
  buildIngestDestinationPath,
  buildIngestFolderName,
} from "@/lib/aiEditor/mediaPathBuilder";

const CAMERA_OPTIONS = ["CAMERA_A", "CAMERA_B", "CAMERA_C", "AUDIO", "DRONE", "OTHER"] as const;

export type ManagedIngestOptions = {
  verifyCopy: boolean;
  generateProxies: boolean;
  generateThumbnails: boolean;
  extractMetadata: boolean;
  analyzeDuringIngest: boolean;
};

type Props = {
  projectName: string;
  clientOrProject: string;
  shootLabel: string;
  sources: DetectedMediaSource[];
  selectedSourceId: string | null;
  onSelectSource: (id: string) => void;
  cameraAssignment: string;
  onCameraAssignmentChange: (v: string) => void;
  shootLabelEdit: string;
  onShootLabelChange: (v: string) => void;
  destinationRoot: string | null;
  destinationLabel?: string | null;
  freeBytes?: number | null;
  options: ManagedIngestOptions;
  onOptionsChange: (next: ManagedIngestOptions) => void;
  scanning: boolean;
  onRescan: () => void;
  /** Phase A: use source with existing manual copy flow */
  onUseSourceFolder: () => void;
  disabled?: boolean;
};

export function ManagedIngestReview({
  projectName,
  clientOrProject,
  shootLabel,
  sources,
  selectedSourceId,
  onSelectSource,
  cameraAssignment,
  onCameraAssignmentChange,
  shootLabelEdit,
  onShootLabelChange,
  destinationRoot,
  destinationLabel,
  freeBytes,
  options,
  onOptionsChange,
  scanning,
  onRescan,
  onUseSourceFolder,
  disabled,
}: Props) {
  if (!sources.length && !scanning) return null;

  const selected = sources.find((s) => s.id === selectedSourceId) || sources[0] || null;
  const folderName = selected
    ? buildIngestFolderName({
        clientOrProject,
        shootLabel: shootLabelEdit || shootLabel,
        cameraLabel: cameraLabelFromAssignment(cameraAssignment, selected),
      })
    : "";
  const destPath =
    destinationRoot && folderName
      ? buildIngestDestinationPath(destinationRoot, folderName)
      : null;

  const requiredBytes = selected
    ? Math.round(selected.totalBytes * (options.generateProxies ? 1.35 : 1.05))
    : 0;
  const spaceOk =
    freeBytes == null || !selected ? true : freeBytes > requiredBytes + 2 * 1024 * 1024 * 1024;

  return (
    <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4 text-sky-700" />
            <h3 className="text-sm font-semibold text-sky-950">Camera media detected</h3>
            {scanning ? (
              <Badge variant="warning">Scanning…</Badge>
            ) : (
              <Badge variant="success">{sources.length} source{sources.length === 1 ? "" : "s"}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-sky-900/80">
            Project: {projectName}. Confirm camera and destination — nothing copies until you start
            ingest (Phase B). Card stays read-only.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRescan} disabled={disabled || scanning}>
          {scanning ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Rescan
        </Button>
      </div>

      <div className="grid gap-2">
        {sources.map((s) => {
          const active = (selected?.id || "") === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSource(s.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? "border-sky-400 bg-white shadow-sm"
                  : "border-sky-100 bg-white/70 hover:border-sky-300"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-slate-900">
                  {s.probableCameraModel || s.manufacturer || "Camera media"}
                </div>
                <span className="text-xs text-slate-500">
                  {Math.round(s.confidence * 100)}% match
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {s.mediaMediumLabel}
                {s.label ? ` · ${s.label}` : ""} · {s.clipCount} clips · {formatBytes(s.totalBytes)}
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                {s.mediaRoot}
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="space-y-3 rounded-xl border border-white/80 bg-white/90 p-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Assign to</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={cameraAssignment}
              disabled={disabled}
              onChange={(e) => onCameraAssignmentChange(e.target.value)}
            >
              {CAMERA_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                  {selected.probableCameraModel && c === selected.suggestedCameraAssignment
                    ? ` — ${selected.probableCameraModel}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Shoot label</span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={shootLabelEdit}
              disabled={disabled}
              onChange={(e) => onShootLabelChange(e.target.value)}
              placeholder={shootLabel}
            />
          </label>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <HardDrive className="h-3.5 w-3.5" />
              Destination preview
            </div>
            <p className="mt-1">
              {destinationLabel || "Edit folder"}
              {freeBytes != null ? ` · ${formatBytes(freeBytes)} free` : ""}
            </p>
            {destPath ? (
              <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{destPath}</p>
            ) : (
              <p className="mt-1 text-amber-800">Set an edit folder in Step 2 first.</p>
            )}
            {!spaceOk ? (
              <p className="mt-2 font-medium text-red-700">
                Not enough storage — need about {formatBytes(requiredBytes)} (with headroom), have{" "}
                {formatBytes(freeBytes || 0)}.
              </p>
            ) : selected ? (
              <p className="mt-2 text-slate-500">
                Required ~{formatBytes(requiredBytes)}
                {options.generateProxies ? " (includes proxy estimate)" : ""}.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {(
              [
                ["verifyCopy", "Verify copied media"],
                ["generateProxies", "Generate proxies"],
                ["generateThumbnails", "Generate thumbnails"],
                ["extractMetadata", "Extract technical metadata"],
                ["analyzeDuringIngest", "Begin analysis automatically"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={options[key]}
                  disabled={disabled}
                  onChange={(e) =>
                    onOptionsChange({ ...options, [key]: e.target.checked })
                  }
                />
                <span className="text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={onUseSourceFolder}
              disabled={disabled || !selected || !destinationRoot}
            >
              Use this source
            </Button>
            <Button size="sm" variant="secondary" disabled title="Managed verified ingest — Phase B">
              Ingest (next)
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            “Use this source” fills Step 3 for the existing copy/catalog flow. Full one-click Ingest
            (pipelined verify → proxy → analysis) ships in Phase B.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function cameraLabelFromAssignment(assignment: string, source: DetectedMediaSource): string {
  if (source.probableCameraModel) {
    const m = source.probableCameraModel.replace(/^Sony\s+/i, "").replace(/\s+/g, "");
    if (m) return m;
  }
  return assignment.replace("CAMERA_", "Cam");
}

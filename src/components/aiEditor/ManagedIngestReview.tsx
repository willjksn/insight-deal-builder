"use client";

import { HardDrive, Loader2, MemoryStick, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/aiEditor/checksum";
import type { DetectedMediaSource } from "@/lib/aiEditor/cameraDetectors/detectMediaSource";
import {
  buildIngestDestinationPath,
  buildIngestFolderName,
  sanitizePathSegment,
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
  /** Short drive name only — free space passed separately to avoid duplicates. */
  destinationDriveName?: string | null;
  freeBytes?: number | null;
  options: ManagedIngestOptions;
  onOptionsChange: (next: ManagedIngestOptions) => void;
  scanning: boolean;
  onRescan: () => void;
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
  destinationDriveName,
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
        clientOrProject: sanitizePathSegment(clientOrProject, 40),
        shootLabel: sanitizePathSegment(shootLabelEdit || shootLabel || "Shoot", 40),
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
    <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MemoryStick className="h-4 w-4 shrink-0 text-sky-700" />
            <h3 className="text-sm font-semibold text-sky-950">
              {scanning ? "Looking for camera cards…" : "We found media on a drive"}
            </h3>
            {!scanning && sources.length > 0 ? (
              <Badge variant="success">
                {sources.length} drive{sources.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-sky-900/85">
            This is a <span className="font-medium">preview</span> for project “{projectName}”.
            ShootSpine is <span className="font-medium">not copying yet</span> — your card stays
            untouched. Pick the drive that has your clips, check where files would land, then
            continue below.
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

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sky-900/70">
          1 · From (source)
        </p>
        <div className="grid gap-2">
          {sources.map((s) => {
            const active = (selected?.id || "") === s.id;
            const letter = s.mountPath.match(/^([A-Za-z]:)/)?.[1]?.toUpperCase();
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
                    {letter ? `${letter} · ` : ""}
                    {s.probableCameraModel || s.manufacturer || "Media on this drive"}
                  </div>
                  <span className="text-xs text-slate-500">
                    {s.confidence >= 0.55 ? "Likely match" : "Best guess"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {s.mediaMediumLabel}
                  {s.label ? ` · “${s.label}”` : ""} · {s.clipCount} file
                  {s.clipCount === 1 ? "" : "s"} · {formatBytes(s.totalBytes)}
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                  {s.mediaRoot}
                </div>
              </button>
            );
          })}
        </div>
        {selected && selected.confidence < 0.55 ? (
          <p className="mt-1.5 text-[11px] text-amber-800">
            We’re not sure this is a camera card (could be an external drive with footage). Check
            the path above — if it’s wrong, pick another drive or use “Footage folder” below.
          </p>
        ) : null}
      </div>

      {selected ? (
        <>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sky-900/70">
              2 · To (on this PC)
            </p>
            <div className="space-y-3 rounded-xl border border-white/80 bg-white/90 p-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Assign as</span>
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
                <span className="mb-1 block text-slate-600">
                  Shoot name <span className="font-normal text-slate-400">(folder label)</span>
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={shootLabelEdit}
                  disabled={disabled}
                  onChange={(e) => onShootLabelChange(e.target.value)}
                  placeholder="e.g. Interview, Reception, HorrorShort"
                />
              </label>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <HardDrive className="h-3.5 w-3.5" />
                  Files would go here
                </div>
                <p className="mt-1 text-slate-600">
                  {destinationDriveName || "Edit drive from Step 2"}
                  {freeBytes != null ? ` · ${formatBytes(freeBytes)} free` : ""}
                </p>
                {destPath ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{destPath}</p>
                ) : (
                  <p className="mt-1 text-amber-800">
                    Choose an edit folder in Step 2 first (where this project lives).
                  </p>
                )}
                {!spaceOk ? (
                  <p className="mt-2 font-medium text-red-700">
                    Not enough free space for this card (~{formatBytes(requiredBytes)} needed with
                    headroom).
                  </p>
                ) : destPath ? (
                  <p className="mt-2 text-slate-500">
                    Folder name is automatic. One-click copy into this path is coming next — for now
                    use the button below to point Step 3 at the card.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sky-900/70">
              3 · What you can do now
            </p>
            <div className="space-y-2 rounded-xl border border-white/80 bg-white/90 p-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={onUseSourceFolder}
                  disabled={disabled || !selected}
                >
                  Use this drive as source
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                That fills the “Footage folder” field below with the card/drive path. Then click{" "}
                <span className="font-medium">Copy into project folders</span> (or catalog in place)
                — same as picking the folder by hand.
              </p>
              <p className="text-[11px] text-slate-500">
                Full “Ingest” (auto-verify, proxies, analysis in one click) is the next build step.
                Checkboxes for those options will matter then; they don’t start work yet.
              </p>
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700">
                  Options for later (not active yet)
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["verifyCopy", "Verify copied media"],
                      ["generateProxies", "Generate proxies"],
                      ["generateThumbnails", "Generate thumbnails"],
                      ["extractMetadata", "Extract technical metadata"],
                      ["analyzeDuringIngest", "Begin analysis automatically"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-start gap-2 opacity-80">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={options[key]}
                        disabled={disabled}
                        onChange={(e) =>
                          onOptionsChange({ ...options, [key]: e.target.checked })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function cameraLabelFromAssignment(assignment: string, source: DetectedMediaSource): string {
  if (source.probableCameraModel) {
    const m = source.probableCameraModel
      .replace(/^Sony\s+/i, "")
      .replace(/^Zoom\s+/i, "")
      .replace(/\s+/g, "");
    if (m && m.length < 20) return m;
  }
  if (assignment === "AUDIO") return "Audio";
  if (assignment === "DRONE") return "Drone";
  if (assignment === "OTHER") return "Other";
  return assignment.replace("CAMERA_", "Cam");
}

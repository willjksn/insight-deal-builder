"use client";

import { HardDrive, Loader2, MemoryStick, RefreshCw } from "lucide-react";
import { CameraLabelPicker } from "@/components/aiEditor/CameraLabelPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes, sanitizeCameraLabel } from "@/lib/aiEditor/checksum";
import type { DetectedMediaSource } from "@/lib/aiEditor/cameraDetectors/detectMediaSource";
import {
  buildIngestDestinationPath,
  buildIngestFolderName,
  sanitizePathSegment,
} from "@/lib/aiEditor/mediaPathBuilder";

export type ManagedIngestOptions = {
  verifyCopy: boolean;
  generateProxies: boolean;
  generateThumbnails: boolean;
  extractMetadata: boolean;
  analyzeDuringIngest: boolean;
};

export type DestinationDriveOption = {
  /** Drive root, e.g. H:\ */
  rootPath: string;
  label: string;
  freeBytes?: number;
  storageType?: string;
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
  destinationDrives: DestinationDriveOption[];
  onDestinationRootChange: (rootPath: string) => void;
  freeBytes?: number | null;
  options: ManagedIngestOptions;
  onOptionsChange: (next: ManagedIngestOptions) => void;
  scanning: boolean;
  onRescan: () => void;
  onUseSourceFolder: () => void;
  /** One-click verified copy into the saved project workspace (Phase B). */
  onIngestIntoProject?: () => void;
  ingesting?: boolean;
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
  destinationDrives,
  onDestinationRootChange,
  freeBytes,
  options,
  onOptionsChange,
  scanning,
  onRescan,
  onUseSourceFolder,
  onIngestIntoProject,
  ingesting,
  disabled,
}: Props) {
  if (!sources.length && !scanning) return null;

  const selected = sources.find((s) => s.id === selectedSourceId) || sources[0] || null;
  const selectedDest =
    destinationDrives.find((d) => normalizeRoot(d.rootPath) === normalizeRoot(destinationRoot || "")) ||
    destinationDrives[0] ||
    null;
  const effectiveDestRoot = destinationRoot || selectedDest?.rootPath || null;
  const effectiveFree =
    freeBytes ?? selectedDest?.freeBytes ?? null;
  const folderName = selected
    ? buildIngestFolderName({
        clientOrProject: sanitizePathSegment(clientOrProject, 40),
        shootLabel: sanitizePathSegment(shootLabelEdit || shootLabel || "Shoot", 40),
        cameraLabel: folderCameraLabel(cameraAssignment, selected),
      })
    : "";
  const destPath =
    effectiveDestRoot && folderName
      ? buildIngestDestinationPath(effectiveDestRoot, folderName)
      : null;

  const requiredBytes = selected
    ? Math.round(selected.totalBytes * (options.generateProxies ? 1.35 : 1.05))
    : 0;
  const spaceOk =
    effectiveFree == null || !selected
      ? true
      : effectiveFree > requiredBytes + 2 * 1024 * 1024 * 1024;

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
              <CameraLabelPicker
                idPrefix="ingest-camera"
                value={cameraAssignment}
                onChange={onCameraAssignmentChange}
                disabled={disabled}
                detectedModel={selected.probableCameraModel}
                suggestedRole={selected.suggestedCameraAssignment}
              />

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

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Save footage to drive</span>
                {destinationDrives.length ? (
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={normalizeRoot(effectiveDestRoot || destinationDrives[0]!.rootPath)}
                    disabled={disabled}
                    onChange={(e) => onDestinationRootChange(e.target.value)}
                  >
                    {destinationDrives.map((d) => (
                      <option key={normalizeRoot(d.rootPath)} value={normalizeRoot(d.rootPath)}>
                        {d.label}
                        {d.freeBytes != null ? ` · ${formatBytes(d.freeBytes)} free` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    No destination drives listed yet. Connect the Desktop Agent, plug in your SSD
                    (e.g. T7 on H:), click Rescan, or set the edit folder in Step 2.
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-500">
                  Prefer your external SSD (T7 / H:). Camera cards stay in the source list only.
                  Picking a drive updates Step 2’s edit folder to{" "}
                  <span className="font-mono">Media\ShootSpine</span> — then click{" "}
                  <span className="font-medium">Save workspace</span> in Step 2.
                </p>
              </label>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <HardDrive className="h-3.5 w-3.5" />
                  Files would go here
                </div>
                {destPath ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{destPath}</p>
                ) : (
                  <p className="mt-1 text-amber-800">Pick a destination drive above.</p>
                )}
                {!spaceOk ? (
                  <p className="mt-2 font-medium text-red-700">
                    Not enough free space for this card (~{formatBytes(requiredBytes)} needed with
                    headroom).
                  </p>
                ) : destPath ? (
                  <p className="mt-2 text-slate-500">
                    Folder name is automatic. Pick an SSD (or use your saved workspace), then ingest
                    below.
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
                  onClick={() => onIngestIntoProject?.()}
                  disabled={
                    disabled ||
                    ingesting ||
                    !selected ||
                    !spaceOk ||
                    !onIngestIntoProject
                  }
                >
                  {ingesting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Ingesting…
                    </>
                  ) : (
                    "Ingest into project"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onUseSourceFolder}
                  disabled={disabled || ingesting || !selected}
                >
                  Use this drive as source
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                <span className="font-medium">Ingest into project</span> copies every clip on this
                card into your workspace with checksum verify (and proxies if checked). Or use the
                drive as source → Review files → Copy & verify for a selective pass.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked
                    disabled
                    readOnly
                  />
                  <span>
                    Verify copied media
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      Always on for one-click ingest (checksum).
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={options.generateProxies}
                    disabled={disabled || ingesting}
                    onChange={(e) =>
                      onOptionsChange({ ...options, generateProxies: e.target.checked })
                    }
                  />
                  <span>Generate proxies while ingesting</span>
                </label>
              </div>
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700">
                  Later pipeline options (not in one-click yet)
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["generateThumbnails", "Generate thumbnails"],
                      ["extractMetadata", "Extract technical metadata"],
                      ["analyzeDuringIngest", "Begin analysis automatically"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-start gap-2 opacity-70">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={options[key]}
                        disabled
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

function normalizeRoot(p: string): string {
  const s = p.replace(/\//g, "\\").trim();
  if (/^[A-Za-z]:$/i.test(s)) return `${s.toUpperCase()}\\`;
  if (/^[A-Za-z]:\\$/i.test(s)) return s.toUpperCase();
  const m = s.match(/^([A-Za-z]:)/);
  return m ? `${m[1].toUpperCase()}\\` : s;
}

/** Human folder segment for the managed ingest path preview. */
function folderCameraLabel(assignment: string, source: DetectedMediaSource): string {
  if (assignment?.trim()) return sanitizeCameraLabel(assignment);
  if (source.probableCameraModel) {
    const m = source.probableCameraModel
      .replace(/^Sony\s+/i, "")
      .replace(/^Zoom\s+/i, "")
      .replace(/\s+/g, "");
    if (m && m.length < 20) return sanitizeCameraLabel(m);
  }
  return "CAMERA_A";
}

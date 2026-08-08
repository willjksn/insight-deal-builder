import { joinProjectRelative, toRelativeProjectPath } from "@/lib/aiEditor/mediaPathResolver";
import type { MediaAsset } from "@/lib/aiEditor/types";

/** Typed exactly by the user before reclaiming (deleting) an active project copy. */
export const SAFE_DELETE_CONFIRM_PHRASE = "DELETE_ACTIVE_COPY";

export type ArchivePlanItem = {
  mediaAssetId: string;
  filename: string;
  sourcePath: string;
  destPath: string;
  relativeArchivePath: string;
};

export type ArchiveSkip = {
  mediaAssetId: string;
  filename: string;
  reason: string;
};

export type ReclaimEligibility = {
  ok: boolean;
  reason: string;
  activePath?: string;
  archivePath?: string;
};

export type ArchiveStateSummary = {
  total: number;
  withLocalSource: number;
  archived: number;
  reclaimable: number;
  restorable: number;
};

function normalizeAbs(p: string): string {
  return p.replace(/[\\\/]+$/, "").replace(/\\/g, "/");
}

function isUnderRoot(root: string, candidate: string): boolean {
  const r = normalizeAbs(root).toLowerCase();
  const c = normalizeAbs(candidate).toLowerCase();
  return c === r || c.startsWith(`${r}/`);
}

/** Prefer managed project path, then currentPath. */
export function sourcePathForArchive(asset: MediaAsset, projectRoot?: string): string | null {
  if (asset.currentPath?.trim()) return asset.currentPath.trim();
  if (projectRoot?.trim() && asset.relativeProjectPath?.trim()) {
    return joinProjectRelative(projectRoot.trim(), asset.relativeProjectPath.trim());
  }
  return null;
}

export function relativePathForArchive(asset: MediaAsset, projectRoot?: string): string {
  if (asset.relativeProjectPath?.trim()) {
    return asset.relativeProjectPath.trim().replace(/\\/g, "/");
  }
  if (projectRoot?.trim() && asset.currentPath?.trim()) {
    const rel = toRelativeProjectPath(projectRoot.trim(), asset.currentPath.trim());
    if (rel) return rel;
  }
  const cam = (asset.cameraAssignment || "CAMERA_A").replace(/[^\w\-]+/g, "_");
  return `01_ORIGINAL_MEDIA/${cam}/${asset.filename}`;
}

/**
 * Plan verified copies into `{archiveRoot}/{projectSlug}/{relativeProjectPath}`.
 * Skips clips that already have archivePath matching the planned dest, or lack a source.
 */
export function planArchiveBatch(input: {
  media: MediaAsset[];
  projectRoot?: string;
  archiveRoot: string;
  projectSlug: string;
}): { items: ArchivePlanItem[]; skipped: ArchiveSkip[] } {
  const archiveRoot = input.archiveRoot.trim();
  const slug = input.projectSlug.trim().replace(/[^\w\-.\s]+/g, "_").replace(/\s+/g, "_") || "project";
  const items: ArchivePlanItem[] = [];
  const skipped: ArchiveSkip[] = [];

  for (const asset of input.media) {
    const sourcePath = sourcePathForArchive(asset, input.projectRoot);
    if (!sourcePath) {
      skipped.push({
        mediaAssetId: asset.id,
        filename: asset.filename,
        reason: "No local source path",
      });
      continue;
    }
    if (asset.archivePath?.trim() && asset.archivePath.trim() === asset.currentPath?.trim()) {
      skipped.push({
        mediaAssetId: asset.id,
        filename: asset.filename,
        reason: "Already only on archive path",
      });
      continue;
    }

    const relativeArchivePath = relativePathForArchive(asset, input.projectRoot);
    const destPath = joinProjectRelative(archiveRoot, `${slug}/${relativeArchivePath}`);

    if (asset.archivePath?.trim() && normalizeAbs(asset.archivePath) === normalizeAbs(destPath)) {
      skipped.push({
        mediaAssetId: asset.id,
        filename: asset.filename,
        reason: "Already archived at destination",
      });
      continue;
    }

    items.push({
      mediaAssetId: asset.id,
      filename: asset.filename,
      sourcePath,
      destPath,
      relativeArchivePath: `${slug}/${relativeArchivePath}`,
    });
  }

  return { items, skipped };
}

/** Plan restore from archivePath back under projectRoot using relativeProjectPath. */
export function planRestoreBatch(input: {
  media: MediaAsset[];
  projectRoot: string;
}): { items: ArchivePlanItem[]; skipped: ArchiveSkip[] } {
  const projectRoot = input.projectRoot.trim();
  const items: ArchivePlanItem[] = [];
  const skipped: ArchiveSkip[] = [];

  for (const asset of input.media) {
    const archivePath = asset.archivePath?.trim();
    if (!archivePath) {
      skipped.push({
        mediaAssetId: asset.id,
        filename: asset.filename,
        reason: "No archive path",
      });
      continue;
    }

    const rel = relativePathForArchive(asset, projectRoot);
    const destPath = joinProjectRelative(projectRoot, rel);

    if (asset.currentPath?.trim() && isUnderRoot(projectRoot, asset.currentPath)) {
      skipped.push({
        mediaAssetId: asset.id,
        filename: asset.filename,
        reason: "Active project copy already present",
      });
      continue;
    }

    items.push({
      mediaAssetId: asset.id,
      filename: asset.filename,
      sourcePath: archivePath,
      destPath,
      relativeArchivePath: rel,
    });
  }

  return { items, skipped };
}

/**
 * Safe reclaim of the *active project copy only*.
 * Never allows deleting archivePath, camera cards, or the sole remaining copy.
 */
export function canReclaimActiveCopy(
  asset: MediaAsset,
  projectRoot?: string
): ReclaimEligibility {
  const archivePath = asset.archivePath?.trim();
  if (!archivePath) {
    return { ok: false, reason: "No verified archive path — archive before reclaiming active space" };
  }

  const activePath = asset.currentPath?.trim();
  if (!activePath) {
    return { ok: false, reason: "No active path to reclaim", archivePath };
  }

  if (normalizeAbs(activePath) === normalizeAbs(archivePath)) {
    return {
      ok: false,
      reason: "Active path is the archive — refusing to delete the archive copy",
      activePath,
      archivePath,
    };
  }

  if (!projectRoot?.trim()) {
    return {
      ok: false,
      reason: "Project root unknown — refuse delete outside managed folders",
      activePath,
      archivePath,
    };
  }

  if (!isUnderRoot(projectRoot, activePath)) {
    return {
      ok: false,
      reason: "Active path is outside the project root (camera cards are never erased)",
      activePath,
      archivePath,
    };
  }

  return {
    ok: true,
    reason: "Safe to delete active project copy after archive verify",
    activePath,
    archivePath,
  };
}

export function summarizeArchiveState(
  media: MediaAsset[],
  projectRoot?: string
): ArchiveStateSummary {
  let withLocalSource = 0;
  let archived = 0;
  let reclaimable = 0;
  let restorable = 0;

  for (const m of media) {
    if (sourcePathForArchive(m, projectRoot)) withLocalSource += 1;
    if (m.archivePath?.trim()) {
      archived += 1;
      if (canReclaimActiveCopy(m, projectRoot).ok) reclaimable += 1;
      if (projectRoot && planRestoreBatch({ media: [m], projectRoot }).items.length) {
        restorable += 1;
      }
    }
  }

  return {
    total: media.length,
    withLocalSource,
    archived,
    reclaimable,
    restorable,
  };
}

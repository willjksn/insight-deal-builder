/**
 * V13 — rewrite project/media paths when an external volume remounts under a new letter.
 */

import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import { driveForPath, friendlyDriveLabel } from "@/lib/aiEditor/storageDrives";
import { joinProjectRelative, toRelativeProjectPath } from "@/lib/aiEditor/mediaPathResolver";
import type { MediaAsset, StorageLocation } from "@/lib/aiEditor/types";

export type RemountKind = "edit" | "archive";

export type RemountCandidate = {
  kind: RemountKind;
  volumeIdentifier: string;
  oldPath: string;
  newPath: string;
  newDriveRoot: string;
  driveLabel: string;
};

function normalizeAbs(p: string): string {
  return p.replace(/\//g, "\\").replace(/[\\\/]+$/, "");
}

function driveRootOf(path: string): string | null {
  const m = path.replace(/\//g, "\\").match(/^([A-Za-z]:)\\?/);
  return m ? `${m[1].toUpperCase()}\\` : null;
}

/** Replace the drive-root prefix of an absolute path when the volume remounts. */
export function rewritePathOnNewDrive(
  absolutePath: string,
  oldDriveRoot: string,
  newDriveRoot: string
): string | null {
  const abs = absolutePath.replace(/\//g, "\\");
  const oldLetter = driveRootOf(oldDriveRoot);
  const absLetter = driveRootOf(abs);
  const newLetter = driveRootOf(newDriveRoot);
  if (!oldLetter || !absLetter || !newLetter) return null;
  if (absLetter.toLowerCase() !== oldLetter.toLowerCase()) return null;
  const rest = abs.slice(absLetter.length).replace(/^[\\\/]+/, "");
  return rest ? `${newLetter}${rest}` : newLetter;
}

export function rewriteProjectRootOnDrive(
  projectRootPath: string,
  newDriveRoot: string
): string | null {
  const oldDrive = driveRootOf(projectRootPath);
  if (!oldDrive) return null;
  return rewritePathOnNewDrive(projectRootPath, oldDrive, newDriveRoot);
}

function volumeIdOfDrive(drive: AgentDriveEntry | null | undefined): string | null {
  const id = drive?.volumeIdentifier?.trim();
  return id || null;
}

function findDriveByVolumeId(
  volumeIdentifier: string,
  drives: AgentDriveEntry[]
): AgentDriveEntry | null {
  const target = volumeIdentifier.trim().toLowerCase();
  if (!target) return null;
  return (
    drives.find(
      (d) =>
        (d.kind === "drive" || d.kind === "volume") &&
        d.volumeIdentifier?.trim().toLowerCase() === target
    ) || null
  );
}

function resolveVolumeId(opts: {
  path: string;
  settingsVolumeId?: string | null;
  storage: StorageLocation[];
}): string | null {
  const fromSettings = opts.settingsVolumeId?.trim();
  if (fromSettings) return fromSettings;
  const normalized = normalizeAbs(opts.path).toLowerCase();
  const match = opts.storage.find(
    (s) => s.volumeIdentifier?.trim() && normalizeAbs(s.path).toLowerCase() === normalized
  );
  if (match?.volumeIdentifier?.trim()) return match.volumeIdentifier.trim();
  // Active storage may be the drive root while project root is a subfolder
  const under = opts.storage
    .filter((s) => s.volumeIdentifier?.trim())
    .sort((a, b) => b.path.length - a.path.length)
    .find((s) => {
      const root = normalizeAbs(s.path).toLowerCase();
      return normalized === root || normalized.startsWith(`${root}\\`);
    });
  return under?.volumeIdentifier?.trim() || null;
}

function candidateForRoot(opts: {
  kind: RemountKind;
  path: string;
  volumeId: string | null;
  drives: AgentDriveEntry[];
}): RemountCandidate | null {
  if (!opts.path.trim() || !opts.volumeId) return null;
  const mounted = findDriveByVolumeId(opts.volumeId, opts.drives);
  if (!mounted) return null;
  const newDriveRoot = mounted.path.replace(/\//g, "\\");
  const oldDriveRoot = driveRootOf(opts.path);
  if (!oldDriveRoot) return null;
  const newLetter = driveRootOf(newDriveRoot);
  if (!newLetter) return null;
  if (oldDriveRoot.toLowerCase() === newLetter.toLowerCase()) {
    // Same letter — still online under remembered path
    return null;
  }
  const newPath = rewriteProjectRootOnDrive(opts.path, newDriveRoot);
  if (!newPath || normalizeAbs(newPath).toLowerCase() === normalizeAbs(opts.path).toLowerCase()) {
    return null;
  }
  return {
    kind: opts.kind,
    volumeIdentifier: opts.volumeId,
    oldPath: normalizeAbs(opts.path),
    newPath,
    newDriveRoot: normalizeAbs(newDriveRoot) + "\\",
    driveLabel: friendlyDriveLabel(mounted),
  };
}

/** Detect edit/archive roots whose volume is online under a new drive letter. */
export function findRemountCandidates(opts: {
  projectRootPath?: string | null;
  archiveRootPath?: string | null;
  projectRootVolumeId?: string | null;
  archiveRootVolumeId?: string | null;
  storage: StorageLocation[];
  drives: AgentDriveEntry[];
}): RemountCandidate[] {
  const out: RemountCandidate[] = [];
  if (opts.projectRootPath?.trim()) {
    const volumeId = resolveVolumeId({
      path: opts.projectRootPath,
      settingsVolumeId: opts.projectRootVolumeId,
      storage: opts.storage,
    });
    const c = candidateForRoot({
      kind: "edit",
      path: opts.projectRootPath,
      volumeId,
      drives: opts.drives,
    });
    if (c) out.push(c);
  }
  if (opts.archiveRootPath?.trim()) {
    const volumeId = resolveVolumeId({
      path: opts.archiveRootPath,
      settingsVolumeId: opts.archiveRootVolumeId,
      storage: opts.storage,
    });
    const c = candidateForRoot({
      kind: "archive",
      path: opts.archiveRootPath,
      volumeId,
      drives: opts.drives,
    });
    if (c) out.push(c);
  }
  return out;
}

export type MediaRemountPatch = {
  id: string;
  currentPath?: string;
  proxyPath?: string;
  archivePath?: string;
  volumeIdentifier?: string;
  onlineStatus?: "online" | "offline" | "unknown";
};

function rewriteUnderRoot(
  absolutePath: string,
  oldRoot: string,
  newRoot: string
): string | null {
  const rel = toRelativeProjectPath(oldRoot, absolutePath);
  if (rel) return joinProjectRelative(newRoot, rel);
  const oldDrive = driveRootOf(oldRoot);
  const newDrive = driveRootOf(newRoot);
  if (!oldDrive || !newDrive) return null;
  // Only letter-swap when the file lived on the same drive as oldRoot
  if (driveRootOf(absolutePath)?.toLowerCase() !== oldDrive.toLowerCase()) return null;
  return rewritePathOnNewDrive(absolutePath, oldDrive, newDrive);
}

/** Rewrite media absolute paths that lived under oldRoot onto newRoot. */
export function planMediaRemount(
  media: MediaAsset[],
  oldRoot: string,
  newRoot: string,
  opts?: { volumeIdentifier?: string; mode?: RemountKind }
): MediaRemountPatch[] {
  const oldNorm = normalizeAbs(oldRoot);
  const newNorm = normalizeAbs(newRoot);
  const mode = opts?.mode ?? "edit";
  const patches: MediaRemountPatch[] = [];

  for (const asset of media) {
    const patch: MediaRemountPatch = { id: asset.id };
    let changed = false;

    if (mode === "archive") {
      if (asset.archivePath?.trim()) {
        const next = rewriteUnderRoot(asset.archivePath.trim(), oldNorm, newNorm);
        if (next && next !== asset.archivePath) {
          patch.archivePath = next;
          changed = true;
        }
      }
    } else {
      if (asset.relativeProjectPath?.trim()) {
        const next = joinProjectRelative(newNorm, asset.relativeProjectPath.trim());
        if (next && next !== asset.currentPath) {
          patch.currentPath = next;
          changed = true;
        }
      } else if (asset.currentPath?.trim()) {
        const next = rewriteUnderRoot(asset.currentPath.trim(), oldNorm, newNorm);
        if (next && next !== asset.currentPath) {
          patch.currentPath = next;
          changed = true;
        }
      }

      if (asset.proxyPath?.trim()) {
        const next = rewriteUnderRoot(asset.proxyPath.trim(), oldNorm, newNorm);
        if (next && next !== asset.proxyPath) {
          patch.proxyPath = next;
          changed = true;
        }
      }
    }

    if (changed) {
      if (opts?.volumeIdentifier) patch.volumeIdentifier = opts.volumeIdentifier;
      if (patch.currentPath) patch.onlineStatus = "online";
      patches.push(patch);
    }
  }

  return patches;
}

/** Volume id for a path from the current drive list (for save). */
export function volumeIdForPath(path: string, drives: AgentDriveEntry[]): string | undefined {
  return volumeIdOfDrive(driveForPath(path, drives)) || undefined;
}

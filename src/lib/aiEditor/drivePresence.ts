/**
 * V16 — detect when edit/backup volumes are unplugged vs remounted under a new letter.
 */

import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import { findRemountCandidates, type RemountCandidate } from "@/lib/aiEditor/remountPaths";
import { driveForPath, friendlyDriveLabel } from "@/lib/aiEditor/storageDrives";
import type { StorageLocation } from "@/lib/aiEditor/types";

export type DrivePresenceStatus = "online" | "offline" | "remount" | "unknown";

export type DrivePresenceItem = {
  kind: "edit" | "archive";
  status: DrivePresenceStatus;
  path: string;
  message: string;
  remount?: RemountCandidate;
};

export type DrivePresenceSummary = {
  items: DrivePresenceItem[];
  /** True when edit folder cannot be used right now */
  editBlocked: boolean;
  /** True when any volume needs attention */
  needsAttention: boolean;
};

function driveLetterRoot(path: string): string | null {
  const m = path.replace(/\//g, "\\").match(/^([A-Za-z]:)/);
  return m ? `${m[1].toUpperCase()}\\` : null;
}

function letterOnline(path: string, drives: AgentDriveEntry[]): boolean {
  const letter = driveLetterRoot(path);
  if (!letter) return true; // non-Windows paths: assume online unless proven otherwise
  return drives.some((d) => {
    if (d.kind !== "drive" && d.kind !== "volume") return false;
    const root = d.path.replace(/\//g, "\\").toUpperCase();
    const normalized = root.endsWith("\\") ? root : `${root}\\`;
    return normalized === letter || normalized === letter.replace(/\\$/, "") + "\\";
  });
}

function volumeOnline(volumeId: string | null | undefined, drives: AgentDriveEntry[]): boolean {
  const id = volumeId?.trim().toLowerCase();
  if (!id) return false;
  return drives.some(
    (d) =>
      (d.kind === "drive" || d.kind === "volume") &&
      d.volumeIdentifier?.trim().toLowerCase() === id
  );
}

function resolveVolumeId(opts: {
  path: string;
  settingsVolumeId?: string | null;
  storage: StorageLocation[];
}): string | null {
  const fromSettings = opts.settingsVolumeId?.trim();
  if (fromSettings) return fromSettings;
  const normalized = opts.path.replace(/\//g, "\\").replace(/[\\\/]+$/, "").toLowerCase();
  const match = opts.storage.find((s) => {
    const p = s.path.replace(/\//g, "\\").replace(/[\\\/]+$/, "").toLowerCase();
    return p === normalized || normalized.startsWith(`${p}\\`);
  });
  return match?.volumeIdentifier?.trim() || null;
}

function presenceForRoot(opts: {
  kind: "edit" | "archive";
  path: string;
  volumeId: string | null;
  drives: AgentDriveEntry[];
  remount?: RemountCandidate;
  /** Explicit agent check when available */
  agentOnline?: boolean | null;
}): DrivePresenceItem {
  const { kind, path, volumeId, drives, remount, agentOnline } = opts;
  const label = kind === "edit" ? "Edit" : "Backup";

  if (remount) {
    return {
      kind,
      status: "remount",
      path,
      message: `${label} drive remounted as a new letter. Relink paths to keep working.`,
      remount,
    };
  }

  if (agentOnline === false) {
    return {
      kind,
      status: "offline",
      path,
      message: `${label} drive looks unplugged (${path}). Plug it back in, then Recheck.`,
    };
  }

  if (agentOnline === true) {
    return {
      kind,
      status: "online",
      path,
      message: `${label} drive is online.`,
    };
  }

  // Infer from drive list
  if (!drives.length) {
    return {
      kind,
      status: "unknown",
      path,
      message: `${label} drive status unknown — connect this computer to check.`,
    };
  }

  const letterOk = letterOnline(path, drives);
  const volOk = volumeId ? volumeOnline(volumeId, drives) : false;

  if (letterOk || volOk) {
    const drive = driveForPath(path, drives);
    const nice = drive ? friendlyDriveLabel(drive) : path;
    return {
      kind,
      status: "online",
      path,
      message: `${label} drive is online (${nice}).`,
    };
  }

  if (volumeId) {
    return {
      kind,
      status: "offline",
      path,
      message: `${label} drive is offline (saved as ${path}). Plug in the same drive, then Recheck — or Relink if Windows gave it a new letter.`,
    };
  }

  return {
    kind,
    status: "offline",
    path,
    message: `${label} folder’s drive letter isn’t mounted (${path}). Plug the drive back in, then Recheck.`,
  };
}

/** Classify edit/backup presence from drives + optional remount candidates / agent stats. */
export function assessDrivePresence(opts: {
  projectRootPath?: string | null;
  archiveRootPath?: string | null;
  projectRootVolumeId?: string | null;
  archiveRootVolumeId?: string | null;
  storage?: StorageLocation[];
  drives: AgentDriveEntry[];
  editAgentOnline?: boolean | null;
  archiveAgentOnline?: boolean | null;
}): DrivePresenceSummary {
  const storage = opts.storage || [];
  const remounts = findRemountCandidates({
    projectRootPath: opts.projectRootPath,
    archiveRootPath: opts.archiveRootPath,
    projectRootVolumeId: opts.projectRootVolumeId,
    archiveRootVolumeId: opts.archiveRootVolumeId,
    storage,
    drives: opts.drives,
  });
  const remountEdit = remounts.find((r) => r.kind === "edit");
  const remountArchive = remounts.find((r) => r.kind === "archive");

  const items: DrivePresenceItem[] = [];

  if (opts.projectRootPath?.trim()) {
    items.push(
      presenceForRoot({
        kind: "edit",
        path: opts.projectRootPath.trim(),
        volumeId: resolveVolumeId({
          path: opts.projectRootPath.trim(),
          settingsVolumeId: opts.projectRootVolumeId,
          storage,
        }),
        drives: opts.drives,
        remount: remountEdit,
        agentOnline: opts.editAgentOnline,
      })
    );
  }

  if (opts.archiveRootPath?.trim()) {
    items.push(
      presenceForRoot({
        kind: "archive",
        path: opts.archiveRootPath.trim(),
        volumeId: resolveVolumeId({
          path: opts.archiveRootPath.trim(),
          settingsVolumeId: opts.archiveRootVolumeId,
          storage,
        }),
        drives: opts.drives,
        remount: remountArchive,
        agentOnline: opts.archiveAgentOnline,
      })
    );
  }

  const edit = items.find((i) => i.kind === "edit");
  const editBlocked = Boolean(
    edit && (edit.status === "offline" || edit.status === "remount")
  );
  const needsAttention = items.some(
    (i) => i.status === "offline" || i.status === "remount"
  );

  return { items, editBlocked, needsAttention };
}

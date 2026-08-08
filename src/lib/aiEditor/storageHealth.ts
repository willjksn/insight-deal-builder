/**
 * V15 — coach the dual-drive edit/backup workflow (guidance, not hard blocks).
 */

import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import {
  driveForPath,
  formatBytesShort,
  inferStorageTypeForPath,
  storageTypeLabel,
} from "@/lib/aiEditor/storageDrives";

export type StorageHealthLevel = "good" | "ok" | "warn" | "risk";

export type StorageHealthItem = {
  id: string;
  level: StorageHealthLevel;
  text: string;
};

export type StorageHealthSummary = {
  level: StorageHealthLevel;
  headline: string;
  items: StorageHealthItem[];
};

const LEVEL_RANK: Record<StorageHealthLevel, number> = {
  good: 0,
  ok: 1,
  warn: 2,
  risk: 3,
};

function worstLevel(levels: StorageHealthLevel[]): StorageHealthLevel {
  let worst: StorageHealthLevel = "good";
  for (const level of levels) {
    if (LEVEL_RANK[level] > LEVEL_RANK[worst]) worst = level;
  }
  return worst;
}

function driveLetterRoot(path: string): string | null {
  const m = path.replace(/\//g, "\\").match(/^([A-Za-z]:)/);
  return m ? m[1].toUpperCase() : null;
}

const LOW_FREE_BYTES = 40 * 1024 ** 3; // ~40 GB

/** Assess edit + backup folder placement against the recommended workflow. */
export function assessStorageHealth(opts: {
  projectRootPath?: string | null;
  archiveRootPath?: string | null;
  drives?: AgentDriveEntry[];
}): StorageHealthSummary | null {
  const projectRoot = opts.projectRootPath?.trim();
  if (!projectRoot) return null;

  const drives = opts.drives || [];
  const items: StorageHealthItem[] = [];
  const editType = inferStorageTypeForPath(projectRoot, drives);
  const editDrive = driveForPath(projectRoot, drives);
  const editLetter = driveLetterRoot(projectRoot);
  const editFree = formatBytesShort(editDrive?.availableBytes);

  if (editType === "externalSSD") {
    items.push({
      id: "edit-ssd",
      level: "good",
      text: editFree
        ? `Edit folder is on an external SSD · ${editFree} free`
        : "Edit folder is on an external SSD — good for proxies and preview",
    });
  } else if (editType === "internal" || /^C:$/i.test(editLetter || "")) {
    items.push({
      id: "edit-internal",
      level: "warn",
      text: "Edit folder is on This PC (internal drive). An external SSD keeps footage off the system drive and usually feels faster.",
    });
  } else if (editType === "externalHDD") {
    items.push({
      id: "edit-hdd",
      level: "ok",
      text: "Edit folder is on an external HDD. It works — an SSD is snappier for proxies and scrubbing.",
    });
  } else if (editType === "removable") {
    items.push({
      id: "edit-removable",
      level: "warn",
      text: "Edit folder looks like a removable stick. Prefer a dedicated external SSD for the working project.",
    });
  } else {
    items.push({
      id: "edit-unknown",
      level: "ok",
      text: `Edit folder detected as ${storageTypeLabel(editType)}${
        editFree ? ` · ${editFree} free` : ""
      }.`,
    });
  }

  if (
    editDrive?.availableBytes != null &&
    editDrive.availableBytes < LOW_FREE_BYTES &&
    editType !== "internal"
  ) {
    items.push({
      id: "edit-low-space",
      level: "warn",
      text: `Edit drive is getting low on space (${formatBytesShort(editDrive.availableBytes)} free). Free space or use a larger SSD before big copies.`,
    });
  }

  const archiveRoot = opts.archiveRootPath?.trim();
  if (!archiveRoot) {
    items.push({
      id: "backup-missing",
      level: "warn",
      text: "No backup folder yet. Set one on an external HDD so you can archive and reclaim later.",
    });
  } else {
    const archiveType = inferStorageTypeForPath(archiveRoot, drives);
    const archiveDrive = driveForPath(archiveRoot, drives);
    const archiveLetter = driveLetterRoot(archiveRoot);
    const archiveFree = formatBytesShort(archiveDrive?.availableBytes);

    if (editLetter && archiveLetter && editLetter === archiveLetter) {
      items.push({
        id: "same-drive",
        level: "risk",
        text: `Edit and backup are both on ${editLetter}. Use a second drive so one failure doesn’t lose both copies.`,
      });
    } else if (archiveType === "externalHDD") {
      items.push({
        id: "backup-hdd",
        level: "good",
        text: archiveFree
          ? `Backup folder is on an external HDD · ${archiveFree} free`
          : "Backup folder is on an external HDD — solid for archive",
      });
    } else if (archiveType === "externalSSD") {
      items.push({
        id: "backup-ssd",
        level: "ok",
        text: "Backup is on an SSD. Fine for speed — a larger HDD is usually better for long-term archive.",
      });
    } else if (archiveType === "internal") {
      items.push({
        id: "backup-internal",
        level: "warn",
        text: "Backup folder is on This PC. Prefer an external HDD so archive isn’t on the same machine disk as Windows.",
      });
    } else {
      items.push({
        id: "backup-other",
        level: "ok",
        text: `Backup folder detected as ${storageTypeLabel(archiveType)}${
          archiveFree ? ` · ${archiveFree} free` : ""
        }.`,
      });
    }
  }

  const level = worstLevel(items.map((i) => i.level));
  const headline =
    level === "good"
      ? "Workspace looks solid"
      : level === "ok"
        ? "Workspace is usable — a few upgrades would help"
        : level === "warn"
          ? "Workspace works, but the recommended setup would be safer/faster"
          : "Fix the drive layout before you rely on this as your only copy";

  return { level, headline, items };
}

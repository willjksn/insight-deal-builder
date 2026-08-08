/**
 * V17 — soft-gate disk-touching actions when edit/backup volumes are offline or need Relink.
 */

import type { DrivePresenceSummary } from "@/lib/aiEditor/drivePresence";

export type DriveActionGates = {
  /** Project root is online and usable for copy/proxy/handoff */
  editDiskReady: boolean;
  /** Backup root is online (or not configured) */
  archiveDiskReady: boolean;
  editBlockReason: string | null;
  archiveBlockReason: string | null;
};

export function driveActionGates(presence: DrivePresenceSummary): DriveActionGates {
  const edit = presence.items.find((i) => i.kind === "edit");
  const archive = presence.items.find((i) => i.kind === "archive");

  let editDiskReady = true;
  let editBlockReason: string | null = null;
  if (edit?.status === "offline") {
    editDiskReady = false;
    editBlockReason =
      "Edit drive is offline. Plug it back in and Recheck before copying, preparing, or writing Resolve files.";
  } else if (edit?.status === "remount") {
    editDiskReady = false;
    editBlockReason =
      "Edit drive letter changed. Relink paths before copying, preparing, or writing Resolve files.";
  }

  let archiveDiskReady = true;
  let archiveBlockReason: string | null = null;
  if (archive?.status === "offline") {
    archiveDiskReady = false;
    archiveBlockReason =
      "Backup drive is offline. Plug it back in and Recheck before archive or restore.";
  } else if (archive?.status === "remount") {
    archiveDiskReady = false;
    archiveBlockReason =
      "Backup drive letter changed. Relink paths before archive or restore.";
  }

  return { editDiskReady, archiveDiskReady, editBlockReason, archiveBlockReason };
}

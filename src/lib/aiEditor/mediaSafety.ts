import type { MediaAsset } from "@/lib/aiEditor/types";

export type MediaSafetyLevel = "red" | "yellow" | "green" | "unknown";

export type MediaSafetySummary = {
  level: MediaSafetyLevel;
  label: string;
  detail: string;
  verifiedAssets: number;
  totalAssets: number;
  inPlaceOnly: number;
};

/** Outcome of a managed card→project ingest pass (for sticky wipe guidance). */
export type PostIngestBackupStatus =
  | "done"
  | "partial"
  | "skipped_no_folder"
  | "skipped_drive"
  | "skipped_stopped"
  | "failed"
  | "not_requested";

export type PostIngestSafetyInput = {
  copiedOk: number;
  failed: number;
  stopped: boolean;
  cameraLabel: string;
  backup: PostIngestBackupStatus;
  backupOk?: number;
  backupFailed?: number;
};

export type PostIngestSafetyView = {
  title: string;
  detail: string;
  wipeGuidance: string;
  tone: "green" | "amber" | "red";
  backupLabel: string;
};

/** Card-wipe guidance after managed ingest — ShootSpine never erases cards. */
export function describePostIngestCardWipe(
  input: PostIngestSafetyInput
): PostIngestSafetyView {
  const cam = input.cameraLabel.replace(/_/g, " ").trim() || "camera";
  const backupLabel = (() => {
    switch (input.backup) {
      case "done":
        return input.backupOk
          ? `Backup: ${input.backupOk} verified on archive`
          : "Backup: verified on archive";
      case "partial":
        return `Backup: ${input.backupOk ?? 0} ok, ${input.backupFailed ?? 0} failed`;
      case "skipped_no_folder":
        return "Backup: skipped (no backup folder set)";
      case "skipped_drive":
        return "Backup: skipped (backup drive not ready)";
      case "skipped_stopped":
        return "Backup: skipped (stopped earlier)";
      case "failed":
        return "Backup: failed — retry in Backup & safety";
      default:
        return "Backup: not requested this pass";
    }
  })();

  if (input.copiedOk <= 0) {
    return {
      title: "Ingest did not save verified clips",
      detail: input.stopped
        ? `Stopped before any ${cam} clips finished copying.`
        : `No clips landed from ${cam}${input.failed ? ` (${input.failed} failed)` : ""}.`,
      wipeGuidance: "Do not erase the camera card.",
      tone: "red",
      backupLabel,
    };
  }

  const hasSecondCopy =
    input.backup === "done" ||
    (input.backup === "partial" && (input.backupOk ?? 0) > 0);
  const allBackedUp =
    input.backup === "done" &&
    (input.backupFailed ?? 0) === 0 &&
    !input.stopped &&
    input.failed === 0;

  if (allBackedUp) {
    return {
      title: `${input.copiedOk} clip${input.copiedOk === 1 ? "" : "s"} verified on project + backup`,
      detail: `${cam} · ${backupLabel}. ShootSpine never erases cards.`,
      wipeGuidance:
        "Confirm both project and backup look good in the media list before you wipe the card.",
      tone: "green",
      backupLabel,
    };
  }

  if (hasSecondCopy || (input.copiedOk > 0 && input.failed === 0 && !input.stopped)) {
    return {
      title: `${input.copiedOk} verified project copy${input.copiedOk === 1 ? "" : "s"}`,
      detail: `${cam} · ${backupLabel}.`,
      wipeGuidance: hasSecondCopy
        ? "Project + some backup copies exist — still confirm before wiping the card."
        : "Safe to keep the card until you also have a backup (or accept a single project copy).",
      tone: hasSecondCopy ? "green" : "amber",
      backupLabel,
    };
  }

  return {
    title: input.stopped
      ? `Stopped — ${input.copiedOk} clip(s) saved`
      : `${input.copiedOk} clip(s) saved with issues`,
    detail: `${cam} · ${backupLabel}${input.failed ? ` · ${input.failed} failed` : ""}.`,
    wipeGuidance: "Do not erase the camera card until every needed clip is verified.",
    tone: "amber",
    backupLabel,
  };
}

/**
 * Project-level original media safety.
 * GREEN: at least one verified managed copy recorded.
 * YELLOW: media indexed but not checksum-verified (in place / catalog only).
 * RED: no media, or copies marked failed.
 * ShootSpine never erases camera cards automatically.
 */
export function summarizeMediaSafety(media: MediaAsset[]): MediaSafetySummary {
  const totalAssets = media.length;
  if (!totalAssets) {
    return {
      level: "unknown",
      label: "No media yet",
      detail: "Add footage to see copy safety status.",
      verifiedAssets: 0,
      totalAssets: 0,
      inPlaceOnly: 0,
    };
  }

  const failed = media.filter((m) => m.ingestStatus === "failed").length;
  const verifiedAssets = media.filter(
    (m) =>
      m.ingestStatus === "verified" ||
      (m.verifiedCopyCount ?? 0) >= 1 ||
      Boolean(m.archivePath?.trim())
  ).length;
  const inPlaceOnly = media.filter((m) => m.ingestStatus === "in_place").length;

  if (failed > 0 && verifiedAssets === 0) {
    return {
      level: "red",
      label: "Copy problems",
      detail: `${failed} file(s) failed ingest. Do not erase any camera card.`,
      verifiedAssets,
      totalAssets,
      inPlaceOnly,
    };
  }

  if (verifiedAssets === totalAssets) {
    return {
      level: "green",
      label: "Verified project copies",
      detail: `${verifiedAssets} clip(s) have a verified copy in the project. Camera cards are never erased by ShootSpine — confirm before you wipe a card.`,
      verifiedAssets,
      totalAssets,
      inPlaceOnly,
    };
  }

  if (verifiedAssets > 0) {
    return {
      level: "yellow",
      label: "Partially verified",
      detail: `${verifiedAssets}/${totalAssets} verified. ${inPlaceOnly} still only referenced in place.`,
      verifiedAssets,
      totalAssets,
      inPlaceOnly,
    };
  }

  return {
    level: "yellow",
    label: "Catalog only",
    detail:
      "Clips are indexed where they sit — not a second verified copy yet. Use “Copy into project folders” before treating a card as safe to erase.",
    verifiedAssets,
    totalAssets,
    inPlaceOnly,
  };
}

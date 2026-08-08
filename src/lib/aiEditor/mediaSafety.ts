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

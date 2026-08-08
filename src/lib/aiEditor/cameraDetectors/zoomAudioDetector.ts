import { kindForExtension } from "@/lib/aiEditor/mediaFormats";
import type { DetectedMediaSource, MediaSourceProbe } from "@/lib/aiEditor/cameraDetectors/types";

/** Zoom F-series / H-series style cards (FOLDER## + WAV). */
export function scoreZoomAudio(probe: MediaSourceProbe): DetectedMediaSource | null {
  const dirs = probe.topLevelDirs.map((d) => d.toUpperCase());
  const folderN = dirs.filter((d) => /^FOLDER\d+/i.test(d)).length;
  const wavs = probe.files.filter((f) => kindForExtension(f.filename) === "audio");
  const reasons: string[] = [];
  let score = 0;

  if (folderN > 0) {
    score += 0.4;
    reasons.push(`${folderN} Zoom-style FOLDER## director(ies)`);
  }
  if (dirs.includes("ZOOM") || dirs.some((d) => d.includes("ZOOM"))) {
    score += 0.3;
    reasons.push("ZOOM folder");
  }
  if (wavs.length >= 2) {
    score += 0.2;
    reasons.push(`${wavs.length} audio file(s)`);
  }

  const label = `${probe.volumeLabel || ""} ${probe.label || ""}`.toUpperCase();
  if (/F8|F6|F2|H8|H6|ZOOM/.test(label)) {
    score += 0.2;
    reasons.push("Volume label looks like Zoom recorder");
  }

  if (score < 0.45 || wavs.length === 0) return null;

  const totalBytes = probe.files.reduce((s, f) => s + (f.sizeBytes || 0), 0);
  return {
    id: `zoom:${probe.volumeIdentifier || probe.mountPath}`,
    sourceType: "audioRecorderCard",
    manufacturer: "Zoom",
    probableCameraModel: /F8/.test(label) ? "Zoom F8n Pro" : "Zoom recorder",
    mediaMediumLabel: "Audio recorder media",
    mediaRoot: probe.mediaRoot || probe.mountPath,
    mountPath: probe.mountPath,
    volumeIdentifier: probe.volumeIdentifier,
    clipCount: wavs.length,
    totalBytes,
    confidence: Math.min(0.9, score),
    reasons,
    suggestedCameraAssignment: "AUDIO",
    files: probe.files,
    removable: probe.removable,
    storageType: probe.storageType,
    label: probe.volumeLabel || probe.label,
  };
}

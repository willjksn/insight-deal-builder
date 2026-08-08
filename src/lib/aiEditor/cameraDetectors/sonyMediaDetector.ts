import { kindForExtension } from "@/lib/aiEditor/mediaFormats";
import type { DetectedMediaSource, MediaSourceProbe } from "@/lib/aiEditor/cameraDetectors/types";

function upperDirs(probe: MediaSourceProbe): Set<string> {
  return new Set(probe.topLevelDirs.map((d) => d.toUpperCase()));
}

function hasPathHint(probe: MediaSourceProbe, segment: string): boolean {
  const needle = segment.toUpperCase();
  if (probe.topLevelDirs.some((d) => d.toUpperCase() === needle)) return true;
  return probe.files.some((f) => f.path.toUpperCase().includes(`\\${needle}\\`) || f.path.toUpperCase().includes(`/${needle}/`));
}

/**
 * Sony FX3 / FX30 / A7-class card layouts (M4ROOT, XDROOT, AVCHD, BPAV).
 * Confidence is heuristic — UI must allow override.
 */
export function scoreSonyMedia(probe: MediaSourceProbe): DetectedMediaSource | null {
  const dirs = upperDirs(probe);
  const reasons: string[] = [];
  let score = 0;
  let mediaRoot = probe.mediaRoot || probe.mountPath;
  let model: string | undefined;

  if (dirs.has("PRIVATE") || hasPathHint(probe, "M4ROOT")) {
    score += 0.45;
    reasons.push("Sony PRIVATE / M4ROOT layout");
    if (hasPathHint(probe, "M4ROOT")) {
      // Prefer M4ROOT as media root when present under PRIVATE
      const m4 = probe.files.find((f) => /M4ROOT/i.test(f.path));
      if (m4) {
        const idx = m4.path.toUpperCase().indexOf("M4ROOT");
        if (idx >= 0) mediaRoot = m4.path.slice(0, idx + "M4ROOT".length);
      }
    }
  }
  if (dirs.has("XDROOT") || hasPathHint(probe, "XDROOT")) {
    score += 0.4;
    reasons.push("Sony XDROOT layout");
  }
  if (dirs.has("AVCHD") || hasPathHint(probe, "AVCHD")) {
    score += 0.25;
    reasons.push("AVCHD structure");
  }
  if (dirs.has("BPAV") || hasPathHint(probe, "BPAV")) {
    score += 0.25;
    reasons.push("BPAV structure");
  }

  const videos = probe.files.filter((f) => kindForExtension(f.filename) === "video");
  const mxf = videos.filter((f) => f.filename.toLowerCase().endsWith(".mxf")).length;
  if (mxf > 0) {
    score += 0.15;
    reasons.push(`${mxf} MXF clip(s)`);
  }

  const label = `${probe.volumeLabel || ""} ${probe.label || ""}`.toUpperCase();
  if (/\bFX3\b/.test(label)) {
    score += 0.2;
    model = "Sony FX3";
    reasons.push("Volume label mentions FX3");
  } else if (/\bFX30\b/.test(label)) {
    score += 0.2;
    model = "Sony FX30";
    reasons.push("Volume label mentions FX30");
  } else if (/\bA7\b/.test(label)) {
    score += 0.1;
    model = "Sony A7";
    reasons.push("Volume label mentions A7");
  }

  if (score < 0.35 || videos.length === 0) return null;

  if (!model) {
    model = mxf > 0 || hasPathHint(probe, "M4ROOT") ? "Sony cinema camera" : "Sony camera";
  }

  const totalBytes = probe.files.reduce((s, f) => s + (f.sizeBytes || 0), 0);
  const medium =
    probe.removable || probe.storageType === "removable"
      ? "Likely CFexpress / camera card"
      : "Camera media";

  return {
    id: `sony:${probe.volumeIdentifier || probe.mountPath}`,
    sourceType: "cameraCard",
    manufacturer: "Sony",
    probableCameraModel: model,
    mediaMediumLabel: medium,
    mediaRoot,
    mountPath: probe.mountPath,
    volumeIdentifier: probe.volumeIdentifier,
    clipCount: videos.length,
    totalBytes,
    confidence: Math.min(0.95, score),
    reasons,
    suggestedCameraAssignment: "CAMERA_A",
    files: probe.files,
    removable: probe.removable,
    storageType: probe.storageType,
    label: probe.volumeLabel || probe.label,
  };
}

import { kindForExtension } from "@/lib/aiEditor/mediaFormats";
import type { DetectedMediaSource, MediaSourceProbe } from "@/lib/aiEditor/cameraDetectors/types";

/** Fallback when layout isn't Sony/Zoom but drive has substantial media. */
export function scoreGenericMedia(probe: MediaSourceProbe): DetectedMediaSource | null {
  const mediaFiles = probe.files.filter((f) => kindForExtension(f.filename));
  if (mediaFiles.length < 1) return null;

  const videos = mediaFiles.filter((f) => kindForExtension(f.filename) === "video");
  const audio = mediaFiles.filter((f) => kindForExtension(f.filename) === "audio");
  const totalBytes = mediaFiles.reduce((s, f) => s + (f.sizeBytes || 0), 0);

  const removable = Boolean(probe.removable || probe.storageType === "removable");
  const external =
    probe.storageType === "externalSSD" ||
    probe.storageType === "externalHDD" ||
    probe.storageType === "removable";

  // Skip giant internal system drives with a few random media files
  if (!removable && !external && mediaFiles.length < 3) return null;
  if (probe.storageType === "internal" && !removable) return null;

  let sourceType: DetectedMediaSource["sourceType"] = "genericMedia";
  if (probe.storageType === "externalSSD") sourceType = "externalSSD";
  else if (probe.storageType === "externalHDD") sourceType = "externalHDD";
  else if (removable && videos.length > 0) sourceType = "cameraCard";
  else if (removable && audio.length > videos.length) sourceType = "audioRecorderCard";

  const confidence = removable ? 0.4 : 0.35;
  return {
    id: `generic:${probe.volumeIdentifier || probe.mountPath}`,
    sourceType,
    mediaMediumLabel: removable ? "Camera media" : "External media",
    mediaRoot: probe.mediaRoot || probe.mountPath,
    mountPath: probe.mountPath,
    volumeIdentifier: probe.volumeIdentifier,
    clipCount: videos.length + audio.length,
    totalBytes,
    confidence,
    reasons: [`${mediaFiles.length} media file(s) on ${removable ? "removable" : "external"} volume`],
    suggestedCameraAssignment: audio.length > videos.length ? "AUDIO" : "CAMERA_A",
    files: probe.files,
    removable: probe.removable,
    storageType: probe.storageType,
    label: probe.volumeLabel || probe.label,
  };
}

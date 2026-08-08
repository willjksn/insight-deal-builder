import { scoreGenericMedia } from "@/lib/aiEditor/cameraDetectors/genericMediaDetector";
import { scoreSonyMedia } from "@/lib/aiEditor/cameraDetectors/sonyMediaDetector";
import { scoreZoomAudio } from "@/lib/aiEditor/cameraDetectors/zoomAudioDetector";
import type { DetectedMediaSource, MediaSourceProbe } from "@/lib/aiEditor/cameraDetectors/types";

export type { DetectedMediaSource, MediaSourceProbe, MediaSourceType } from "@/lib/aiEditor/cameraDetectors/types";

/**
 * Classify a mounted volume probe into a DetectedMediaSource.
 * Prefer specialized detectors; fall back to generic external/removable media.
 */
export function detectMediaSource(probe: MediaSourceProbe): DetectedMediaSource | null {
  if (!probe.mountPath?.trim()) return null;
  if (!probe.files?.length && !probe.topLevelDirs?.length) return null;

  const candidates = [scoreSonyMedia(probe), scoreZoomAudio(probe), scoreGenericMedia(probe)].filter(
    (c): c is DetectedMediaSource => Boolean(c)
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0] || null;
}

export function detectMediaSources(probes: MediaSourceProbe[]): DetectedMediaSource[] {
  const out: DetectedMediaSource[] = [];
  const seen = new Set<string>();
  for (const probe of probes) {
    const d = detectMediaSource(probe);
    if (!d) continue;
    const key = d.volumeIdentifier || d.mountPath;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

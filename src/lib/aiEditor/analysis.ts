/** Local analysis models (V1C). Stored as metadata — not binary media. */

export type TechnicalAnalysis = {
  mediaAssetId: string;
  readable: boolean;
  codec?: string;
  resolution?: string;
  frameRate?: number;
  durationSeconds?: number;
  hasAudio?: boolean;
  audioChannels?: number;
  issues: string[];
  confidence: number;
  analyzedAt: string;
};

export type ShotSegment = {
  id: string;
  mediaAssetId: string;
  index: number;
  startSeconds: number;
  endSeconds: number;
  confidence: number;
  /** wide | medium | close_up | unknown — best-effort */
  shotSize?: string;
  movement?: string;
};

export type TranscriptSegment = {
  id: string;
  mediaAssetId: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  speaker?: string;
  confidence: number;
};

export type ClipAnalysisBundle = {
  mediaAssetId: string;
  technical?: TechnicalAnalysis;
  shots: ShotSegment[];
  transcript: TranscriptSegment[];
  analysisStatus: "none" | "queued" | "running" | "complete" | "failed";
  error?: string;
  updatedAt: string;
};

export function emptyBundle(mediaAssetId: string): ClipAnalysisBundle {
  return {
    mediaAssetId,
    shots: [],
    transcript: [],
    analysisStatus: "none",
    updatedAt: new Date().toISOString(),
  };
}

/** Deterministic mock shot splits for tests / offline demo. */
export function mockShotSegments(
  mediaAssetId: string,
  durationSeconds: number
): ShotSegment[] {
  const dur = Math.max(durationSeconds || 12, 3);
  const cut = dur / 3;
  return [0, 1, 2].map((i) => ({
    id: `${mediaAssetId}_shot_${i}`,
    mediaAssetId,
    index: i,
    startSeconds: Number((i * cut).toFixed(3)),
    endSeconds: Number((i === 2 ? dur : (i + 1) * cut).toFixed(3)),
    confidence: 0.55,
    shotSize: "unknown",
    movement: "unknown",
  }));
}

export function technicalFromProbe(
  mediaAssetId: string,
  probe: {
    codec?: string;
    resolution?: string;
    frameRate?: number;
    durationSeconds?: number;
    audioChannels?: number;
    mediaType?: string;
  }
): TechnicalAnalysis {
  const issues: string[] = [];
  if (!probe.codec) issues.push("Codec not detected");
  if (probe.mediaType === "video" && !probe.resolution) issues.push("Resolution unknown");
  if (probe.mediaType === "video" && (probe.audioChannels ?? 0) < 1) {
    issues.push("No audio track detected");
  }
  return {
    mediaAssetId,
    readable: true,
    codec: probe.codec,
    resolution: probe.resolution,
    frameRate: probe.frameRate,
    durationSeconds: probe.durationSeconds,
    hasAudio: (probe.audioChannels ?? 0) > 0,
    audioChannels: probe.audioChannels,
    issues,
    confidence: issues.length ? 0.7 : 0.92,
    analyzedAt: new Date().toISOString(),
  };
}

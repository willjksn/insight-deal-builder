import type { ShotSegment } from "@/lib/aiEditor/analysis";
import { normalizeShotSize } from "@/lib/aiEditor/matching";

export type SelectWindow = {
  sourceInSeconds: number;
  durationSeconds: number;
  reason: string;
};

const DEFAULT_MAX_CLIP = 12;
const DEFAULT_FALLBACK = 4;
const MIN_SEGMENT = 0.4;
const SHORT_HEAD = 1.5;

function segmentDuration(seg: ShotSegment): number {
  return Math.max(0, (seg.endSeconds || 0) - (seg.startSeconds || 0));
}

function segmentScore(seg: ShotSegment, preferSize?: string): number {
  const dur = segmentDuration(seg);
  let score = dur * (0.5 + 0.5 * Math.min(1, Math.max(0, seg.confidence || 0.5)));
  const size = normalizeShotSize(seg.shotSize);
  if (preferSize && size && size === preferSize) score *= 1.35;
  return score;
}

/**
 * Pick a source in/out window for a preferred take using local shot-break analysis.
 * Deterministic — no AI calls.
 */
export function selectWindowFromAnalysis(input: {
  assetDurationSeconds?: number;
  plannedShotType?: string;
  segments?: ShotSegment[];
  maxClipSeconds?: number;
  fallbackSeconds?: number;
}): SelectWindow {
  const maxClip = input.maxClipSeconds ?? DEFAULT_MAX_CLIP;
  const fallback = input.fallbackSeconds ?? DEFAULT_FALLBACK;
  const assetDur =
    input.assetDurationSeconds && input.assetDurationSeconds > 0
      ? input.assetDurationSeconds
      : undefined;
  const preferSize = normalizeShotSize(input.plannedShotType);

  const segments = (input.segments || [])
    .filter((s) => segmentDuration(s) >= MIN_SEGMENT)
    .slice()
    .sort((a, b) => a.startSeconds - b.startSeconds);

  if (!segments.length) {
    const dur = Math.max(
      0.5,
      assetDur != null ? Math.min(assetDur, maxClip) : fallback
    );
    return {
      sourceInSeconds: 0,
      durationSeconds: dur,
      reason: "Head of file (no shot breaks)",
    };
  }

  let pool = segments;
  if (preferSize) {
    const sized = segments.filter((s) => normalizeShotSize(s.shotSize) === preferSize);
    if (sized.length) pool = sized;
  }

  // Skip a short opening segment (slate / idle) when a longer body exists.
  if (pool.length > 1) {
    const first = pool[0]!;
    const firstDur = segmentDuration(first);
    const rest = pool.slice(1);
    const bodyExists = rest.some((s) => segmentDuration(s) >= firstDur * 1.25);
    const looksLikeHead =
      first.startSeconds <= 0.35 &&
      (firstDur <= SHORT_HEAD ||
        (assetDur != null && firstDur / assetDur <= 0.08));
    if (looksLikeHead && bodyExists) {
      pool = rest;
    }
  }

  let best = pool[0]!;
  let bestScore = segmentScore(best, preferSize || undefined);
  for (const seg of pool.slice(1)) {
    const sc = segmentScore(seg, preferSize || undefined);
    if (sc > bestScore) {
      best = seg;
      bestScore = sc;
    }
  }

  const rawDur = segmentDuration(best);
  const durationSeconds = Math.max(0.5, Math.min(rawDur, maxClip));
  const sourceInSeconds = Math.max(0, best.startSeconds);
  const matched =
    preferSize && normalizeShotSize(best.shotSize) === preferSize
      ? ` · ${preferSize}`
      : "";

  return {
    sourceInSeconds,
    durationSeconds,
    reason: `Shot break ${best.index + 1}${matched}`,
  };
}

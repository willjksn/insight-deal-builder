/**
 * Reels / acts — split long projects so Edit by Chat and finishing stay manageable.
 * Clips keep absolute timeline frames; reels are organizational scopes.
 */

import {
  FEATURE_DEFAULT_RUNTIME_SECONDS,
  FEATURE_REEL_TARGET_SECONDS,
  MAX_CHAT_CONTEXT_CLIPS,
} from "@/lib/aiEditor/limits";
import { framesToSeconds } from "@/lib/aiEditor/frames";
import type {
  Timeline,
  TimelineClip,
  TimelineReel,
  TimelineReelKind,
} from "@/lib/aiEditor/types";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function durationFramesOf(timeline: Timeline): number {
  let max = 0;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.timelineStartFrame + clip.durationFrames);
    }
  }
  return max;
}

export function cloneTimelineShallow(timeline: Timeline): Timeline {
  return {
    ...timeline,
    reels: timeline.reels?.map((r) => ({ ...r })),
    tracks: timeline.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => ({ ...c })),
    })),
  };
}

export function sortedReels(timeline: Timeline): TimelineReel[] {
  return [...(timeline.reels || [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function videoClips(timeline: Timeline): TimelineClip[] {
  return timeline.tracks.find((t) => t.kind === "video")?.clips.slice() ?? [];
}

export function clipsForReel(
  timeline: Timeline,
  reelId: string | null | undefined
): TimelineClip[] {
  const clips = videoClips(timeline);
  if (!reelId) return clips;
  return clips.filter((c) => c.reelId === reelId);
}

export function reelDurationSeconds(timeline: Timeline, reelId: string): number {
  const clips = clipsForReel(timeline, reelId);
  if (!clips.length) return 0;
  return clips.reduce((sum, c) => sum + framesToSeconds(c.durationFrames, timeline.frameRate), 0);
}

export function summarizeReels(timeline: Timeline): Array<{
  id: string;
  name: string;
  kind: TimelineReelKind;
  clipCount: number;
  durationSeconds: number;
  targetDurationSeconds?: number;
}> {
  return sortedReels(timeline).map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    clipCount: clipsForReel(timeline, r.id).length,
    durationSeconds: reelDurationSeconds(timeline, r.id),
    targetDurationSeconds: r.targetDurationSeconds,
  }));
}

/** Ensure at least one “Full cut” reel and assign orphan clips to it. */
export function ensureDefaultReel(timeline: Timeline): Timeline {
  const next = cloneTimelineShallow(timeline);
  if (!next.reels?.length) {
    const reel: TimelineReel = {
      id: newId("reel"),
      name: "Full cut",
      kind: "reel",
      sortOrder: 0,
    };
    next.reels = [reel];
    next.activeReelId = reel.id;
    for (const track of next.tracks) {
      for (const clip of track.clips) {
        if (!clip.reelId) clip.reelId = reel.id;
      }
    }
    return next;
  }
  const fallback = sortedReels(next)[0]!.id;
  if (!next.activeReelId || !next.reels.some((r) => r.id === next.activeReelId)) {
    next.activeReelId = fallback;
  }
  for (const track of next.tracks) {
    for (const clip of track.clips) {
      if (!clip.reelId) clip.reelId = fallback;
    }
  }
  return next;
}

export function setActiveReel(timeline: Timeline, reelId: string): Timeline {
  const next = ensureDefaultReel(timeline);
  if (!next.reels?.some((r) => r.id === reelId)) {
    throw new Error("Reel not found");
  }
  next.activeReelId = reelId;
  next.updatedAt = new Date().toISOString();
  return next;
}

/**
 * Create act/reel structure for a long project.
 * Default: ~1h45 → three acts (~35 min targets).
 * Or pass reelCount to split into N ~20 min reels.
 */
export function setupFeatureReels(
  timeline: Timeline,
  input?: {
    runtimeSeconds?: number;
    mode?: "acts" | "reels";
    reelCount?: number;
  }
): Timeline {
  const next = cloneTimelineShallow(timeline);
  const runtime = input?.runtimeSeconds ?? FEATURE_DEFAULT_RUNTIME_SECONDS;
  const mode = input?.mode ?? "acts";

  let reels: TimelineReel[] = [];
  if (mode === "reels") {
    const count = Math.max(
      2,
      input?.reelCount ?? Math.ceil(runtime / FEATURE_REEL_TARGET_SECONDS)
    );
    const target = Math.round(runtime / count);
    reels = Array.from({ length: count }, (_, i) => ({
      id: newId("reel"),
      name: `Reel ${i + 1}`,
      kind: "reel" as const,
      sortOrder: i,
      targetDurationSeconds: target,
    }));
  } else {
    // Three-act structure for a feature
    const targets = [
      Math.round(runtime * 0.3),
      Math.round(runtime * 0.4),
      Math.round(runtime * 0.3),
    ];
    reels = targets.map((targetDurationSeconds, i) => ({
      id: newId("reel"),
      name: `Act ${i + 1}`,
      kind: "act" as const,
      sortOrder: i,
      targetDurationSeconds,
    }));
  }

  next.reels = reels;
  next.activeReelId = reels[0]?.id;

  // Distribute existing clips across reels by timeline position / total duration
  const clips = videoClips(next);
  const totalFrames = Math.max(1, durationFramesOf(next));
  for (const track of next.tracks) {
    for (const clip of track.clips) {
      const mid = clip.timelineStartFrame + clip.durationFrames / 2;
      const ratio = mid / totalFrames;
      let idx = Math.min(reels.length - 1, Math.floor(ratio * reels.length));
      if (idx < 0) idx = 0;
      clip.reelId = reels[idx]!.id;
    }
  }

  // Empty timeline: still keep structure
  if (!clips.length) {
    /* reels already set */
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export function addReel(
  timeline: Timeline,
  input: { name: string; kind?: TimelineReelKind; targetDurationSeconds?: number }
): Timeline {
  const next = ensureDefaultReel(timeline);
  const reel: TimelineReel = {
    id: newId("reel"),
    name: input.name.trim() || `Reel ${(next.reels?.length || 0) + 1}`,
    kind: input.kind || "reel",
    sortOrder: (next.reels?.length || 0),
    targetDurationSeconds: input.targetDurationSeconds,
  };
  next.reels = [...(next.reels || []), reel];
  next.activeReelId = reel.id;
  next.updatedAt = new Date().toISOString();
  return next;
}

/** Timeline view for chat: only clips in the active (or given) reel, same ids. */
export function timelineScopedToReel(
  timeline: Timeline,
  reelId?: string | null
): { scoped: Timeline; reel: TimelineReel | null; truncated: boolean; totalInReel: number } {
  const withReels = ensureDefaultReel(timeline);
  const id = reelId || withReels.activeReelId || sortedReels(withReels)[0]?.id;
  const reel = withReels.reels?.find((r) => r.id === id) || null;
  const inReel = clipsForReel(withReels, id);
  const sliced = inReel.slice(0, MAX_CHAT_CONTEXT_CLIPS);
  const clipIds = new Set(sliced.map((c) => c.id));

  const scoped: Timeline = {
    ...withReels,
    activeReelId: id,
    tracks: withReels.tracks.map((t) =>
      t.kind === "video"
        ? { ...t, clips: t.clips.filter((c) => clipIds.has(c.id)) }
        : { ...t, clips: [] }
    ),
  };

  return {
    scoped,
    reel,
    truncated: inReel.length > sliced.length,
    totalInReel: inReel.length,
  };
}

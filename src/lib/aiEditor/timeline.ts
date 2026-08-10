/** Internal NLE-independent timeline model + deterministic ops (V1E). */

import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import { framesToSeconds, framesToTimecode, secondsToFrames } from "@/lib/aiEditor/frames";
import { isRoughCutVideoAsset } from "@/lib/aiEditor/mediaFormats";
import { selectWindowFromAnalysis } from "@/lib/aiEditor/selectsFromAnalysis";
import type {
  CoverageReport,
  MediaAsset,
  Timeline,
  TimelineClip,
  TimelineEditOp,
  TimelineTrack,
  TimelineVersion,
} from "@/lib/aiEditor/types";

export const DEFAULT_TIMELINE_FPS = 24;

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyTimeline(input: {
  projectId: string;
  name?: string;
  frameRate?: number;
}): Timeline {
  const now = new Date().toISOString();
  const video: TimelineTrack = {
    id: newId("trk"),
    kind: "video",
    name: "V1",
    clips: [],
  };
  const audio: TimelineTrack = {
    id: newId("trk"),
    kind: "audio",
    name: "A1",
    clips: [],
  };
  return {
    id: newId("tl"),
    projectId: input.projectId,
    name: input.name || "First cut",
    frameRate: input.frameRate || DEFAULT_TIMELINE_FPS,
    tracks: [video, audio],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function timelineDurationFrames(timeline: Timeline): number {
  let max = 0;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.timelineStartFrame + clip.durationFrames);
    }
  }
  return max;
}

export function timelineDurationSeconds(timeline: Timeline): number {
  return framesToSeconds(timelineDurationFrames(timeline), timeline.frameRate);
}

export function summarizeTimeline(timeline: Timeline): {
  durationSeconds: number;
  durationTimecode: string;
  clipCount: number;
  version: number;
} {
  const frames = timelineDurationFrames(timeline);
  return {
    durationSeconds: framesToSeconds(frames, timeline.frameRate),
    durationTimecode: framesToTimecode(frames, timeline.frameRate),
    clipCount: timeline.tracks.reduce((n, t) => n + t.clips.length, 0),
    version: timeline.version,
  };
}

/** Build a first rough cut from preferred takes (coverage order). */
export function buildRoughCutFromCoverage(input: {
  projectId: string;
  coverage: CoverageReport;
  media: MediaAsset[];
  /** Local shot-break analysis — used for source in/out when present. */
  analysis?: ClipAnalysisBundle[];
  name?: string;
  frameRate?: number;
  defaultClipSeconds?: number;
}): Timeline {
  const fps = input.frameRate || DEFAULT_TIMELINE_FPS;
  const fallbackDur = input.defaultClipSeconds ?? 4;
  const mediaById = new Map(input.media.map((m) => [m.id, m]));
  const analysisById = new Map((input.analysis || []).map((a) => [a.mediaAssetId, a]));
  const timeline = emptyTimeline({
    projectId: input.projectId,
    name: input.name || "Rough cut v1",
    frameRate: fps,
  });
  const video = timeline.tracks.find((t) => t.kind === "video")!;
  const audio = timeline.tracks.find((t) => t.kind === "audio")!;

  let cursor = 0;
  for (const row of input.coverage.shots) {
    const mediaId = row.preferredMediaAssetId;
    if (!mediaId) continue;
    const asset = mediaById.get(mediaId);
    if (!asset || !isRoughCutVideoAsset(asset)) continue;
    const bundle = analysisById.get(mediaId);
    const window = selectWindowFromAnalysis({
      assetDurationSeconds: asset.durationSeconds,
      plannedShotType: row.shotType,
      segments: bundle?.shots,
      fallbackSeconds: fallbackDur,
    });
    const durationFrames = Math.max(1, secondsToFrames(window.durationSeconds, fps));
    const sourceInFrame = Math.max(0, secondsToFrames(window.sourceInSeconds, fps));
    const clip: TimelineClip = {
      id: newId("clip"),
      mediaAssetId: mediaId,
      trackId: video.id,
      timelineStartFrame: cursor,
      sourceInFrame,
      durationFrames,
      label: [row.scene, row.shotName || asset.filename].filter(Boolean).join(" · "),
      plannedShotId: row.plannedShotId,
    };
    video.clips.push(clip);
    audio.clips.push({
      ...clip,
      id: newId("clip"),
      trackId: audio.id,
    });
    cursor += durationFrames;
  }

  // Footage-only fallback: sequence real video only (skip camera JPG stills / audio)
  const videoAssets = input.media.filter((m) => isRoughCutVideoAsset(m));
  if (!video.clips.length && videoAssets.length) {
    for (const asset of videoAssets) {
      const bundle = analysisById.get(asset.id);
      const window = selectWindowFromAnalysis({
        assetDurationSeconds: asset.durationSeconds,
        segments: bundle?.shots,
        fallbackSeconds: fallbackDur,
      });
      const durationFrames = Math.max(1, secondsToFrames(window.durationSeconds, fps));
      const sourceInFrame = Math.max(0, secondsToFrames(window.sourceInSeconds, fps));
      const clip: TimelineClip = {
        id: newId("clip"),
        mediaAssetId: asset.id,
        trackId: video.id,
        timelineStartFrame: cursor,
        sourceInFrame,
        durationFrames,
        label: asset.filename,
      };
      video.clips.push(clip);
      audio.clips.push({ ...clip, id: newId("clip"), trackId: audio.id });
      cursor += durationFrames;
    }
  }

  // Short-form default: one “Full cut” reel (feature projects can add acts later).
  const reelId = newId("reel");
  timeline.reels = [
    { id: reelId, name: "Full cut", kind: "reel", sortOrder: 0 },
  ];
  timeline.activeReelId = reelId;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      clip.reelId = reelId;
    }
  }

  timeline.updatedAt = new Date().toISOString();
  return timeline;
}

function cloneTimeline(t: Timeline): Timeline {
  return {
    ...t,
    reels: t.reels?.map((r) => ({ ...r })),
    finishing: t.finishing ? { ...t.finishing } : undefined,
    tracks: t.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((c) => ({
        ...c,
        transitionOut: c.transitionOut ? { ...c.transitionOut } : undefined,
      })),
    })),
  };
}

function findClip(
  timeline: Timeline,
  clipId: string
): { track: TimelineTrack; clip: TimelineClip; index: number } | null {
  for (const track of timeline.tracks) {
    const index = track.clips.findIndex((c) => c.id === clipId);
    if (index >= 0) return { track, clip: track.clips[index], index };
  }
  return null;
}

function compactTrack(track: TimelineTrack): void {
  track.clips.sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
  let cursor = 0;
  for (const clip of track.clips) {
    clip.timelineStartFrame = cursor;
    cursor += clip.durationFrames;
  }
}

/** Drop camera stills / non-video placements and ripple the remaining cut. */
export function stripNonVideoClipsFromTimeline(
  timeline: Timeline,
  media: MediaAsset[]
): { timeline: Timeline; removed: number } {
  const byId = new Map(media.map((m) => [m.id, m]));
  const next = cloneTimeline(timeline);
  let removed = 0;
  for (const track of next.tracks) {
    const keep: TimelineClip[] = [];
    for (const clip of track.clips) {
      const asset = byId.get(clip.mediaAssetId);
      if (asset && isRoughCutVideoAsset(asset)) {
        keep.push(clip);
      } else {
        removed += 1;
      }
    }
    track.clips = keep;
    compactTrack(track);
  }
  next.updatedAt = new Date().toISOString();
  return { timeline: next, removed };
}

/** Apply a single validated edit op. Returns a new timeline (immutable apply). */
export function applyTimelineOp(timeline: Timeline, op: TimelineEditOp): Timeline {
  const next = cloneTimeline(timeline);
  next.updatedAt = new Date().toISOString();

  switch (op.type) {
    case "insert": {
      const track =
        next.tracks.find((t) => t.id === op.trackId) ||
        next.tracks.find((t) => t.kind === "video");
      if (!track) throw new Error("No track for insert");
      const start = Math.max(0, op.timelineStartFrame ?? timelineDurationFrames(next));
      // Ripple later clips
      for (const c of track.clips) {
        if (c.timelineStartFrame >= start) c.timelineStartFrame += op.durationFrames;
      }
      track.clips.push({
        id: newId("clip"),
        mediaAssetId: op.mediaAssetId,
        trackId: track.id,
        timelineStartFrame: start,
        sourceInFrame: op.sourceInFrame ?? 0,
        durationFrames: Math.max(1, op.durationFrames),
        label: op.label,
        plannedShotId: op.plannedShotId,
        reelId: next.activeReelId || next.reels?.[0]?.id,
      });
      track.clips.sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
      break;
    }
    case "trim": {
      const hit = findClip(next, op.clipId);
      if (!hit) throw new Error("Clip not found");
      if (typeof op.sourceInFrame === "number") {
        hit.clip.sourceInFrame = Math.max(0, op.sourceInFrame);
      }
      if (typeof op.durationFrames === "number") {
        hit.clip.durationFrames = Math.max(1, op.durationFrames);
      }
      break;
    }
    case "move": {
      const hit = findClip(next, op.clipId);
      if (!hit) throw new Error("Clip not found");
      hit.clip.timelineStartFrame = Math.max(0, op.timelineStartFrame);
      hit.track.clips.sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
      break;
    }
    case "rippleDelete": {
      const hit = findClip(next, op.clipId);
      if (!hit) throw new Error("Clip not found");
      hit.track.clips.splice(hit.index, 1);
      compactTrack(hit.track);
      break;
    }
    case "split": {
      const hit = findClip(next, op.clipId);
      if (!hit) throw new Error("Clip not found");
      const at = op.atTimelineFrame;
      const rel = at - hit.clip.timelineStartFrame;
      if (rel <= 0 || rel >= hit.clip.durationFrames) {
        throw new Error("Split point outside clip");
      }
      const leftDur = rel;
      const rightDur = hit.clip.durationFrames - rel;
      const right: TimelineClip = {
        ...hit.clip,
        id: newId("clip"),
        timelineStartFrame: at,
        sourceInFrame: hit.clip.sourceInFrame + leftDur,
        durationFrames: rightDur,
      };
      hit.clip.durationFrames = leftDur;
      hit.track.clips.splice(hit.index + 1, 0, right);
      break;
    }
    case "reorder": {
      const track = next.tracks.find((t) => t.id === op.trackId);
      if (!track) throw new Error("Track not found");
      const ordered: TimelineClip[] = [];
      for (const id of op.clipIds) {
        const c = track.clips.find((x) => x.id === id);
        if (c) ordered.push(c);
      }
      for (const c of track.clips) {
        if (!ordered.some((x) => x.id === c.id)) ordered.push(c);
      }
      track.clips = ordered;
      compactTrack(track);
      break;
    }
    default:
      throw new Error("Unknown timeline op");
  }

  return next;
}

export function applyTimelineOps(timeline: Timeline, ops: TimelineEditOp[]): Timeline {
  return ops.reduce((t, op) => applyTimelineOp(t, op), timeline);
}

export function makeTimelineVersion(
  timeline: Timeline,
  note?: string
): TimelineVersion {
  return {
    id: newId("tlv"),
    timelineId: timeline.id,
    projectId: timeline.projectId,
    version: timeline.version,
    note,
    snapshot: cloneTimeline(timeline),
    createdAt: new Date().toISOString(),
  };
}

export function bumpVersion(timeline: Timeline, note?: string): {
  timeline: Timeline;
  versionRecord: TimelineVersion;
} {
  const next = cloneTimeline(timeline);
  next.version += 1;
  next.updatedAt = new Date().toISOString();
  return { timeline: next, versionRecord: makeTimelineVersion(next, note) };
}

/**
 * V7 — reverse import: build a ShootSpine timeline from a Resolve sync snapshot.
 * Creates a new version; does not silently destroy history (caller bumps version).
 */

import { matchResolveClipToMedia } from "@/lib/aiEditor/planningFeedback";
import { ensureDefaultReel } from "@/lib/aiEditor/reels";
import {
  DEFAULT_TIMELINE_FPS,
  emptyTimeline,
  newId,
} from "@/lib/aiEditor/timeline";
import { secondsToFrames } from "@/lib/aiEditor/frames";
import type { MediaAsset, ResolveSyncSnapshot, Timeline } from "@/lib/aiEditor/types";

export type ResolveImportResult = {
  timeline: Timeline;
  matched: number;
  unmatchedNames: string[];
  skippedEmpty: number;
};

/**
 * Build a sequential video timeline from Resolve clip names + durations.
 * Unmatched clip names are skipped (listed in unmatchedNames).
 */
export function buildTimelineFromResolveSync(input: {
  projectId: string;
  sync: ResolveSyncSnapshot;
  media: MediaAsset[];
  /** Preserve finishing / frame rate from the current ShootSpine cut when present. */
  base?: Timeline | null;
  defaultClipSeconds?: number;
}): ResolveImportResult {
  const fps = input.base?.frameRate || input.sync.frameRate || DEFAULT_TIMELINE_FPS;
  const fallbackSec = input.defaultClipSeconds ?? 4;
  const name =
    input.sync.timelineName?.trim() ||
    input.base?.name ||
    "Cut from Resolve";

  let timeline = emptyTimeline({
    projectId: input.projectId,
    name,
    frameRate: fps,
  });
  if (input.base?.finishing) {
    timeline.finishing = { ...input.base.finishing };
  }
  if (input.base?.version) {
    timeline.version = input.base.version;
  }

  const video = timeline.tracks.find((t) => t.kind === "video")!;
  const audio = timeline.tracks.find((t) => t.kind === "audio")!;
  const clips = (input.sync.clips || []).slice(0, 2000);

  const unmatchedNames: string[] = [];
  let matched = 0;
  let skippedEmpty = 0;
  let cursor = 0;
  const timelineOrigin =
    typeof input.sync.startFrame === "number" ? input.sync.startFrame : 0;
  const useResolveTiming = clips.some(
    (c) => typeof c.startFrame === "number" && Number.isFinite(c.startFrame)
  );

  for (const item of clips) {
    const label = (item.name || "").trim();
    if (!label) {
      skippedEmpty += 1;
      continue;
    }
    const asset = matchResolveClipToMedia(label, input.media);
    if (!asset) {
      unmatchedNames.push(label);
      continue;
    }

    let durationFrames = 0;
    if (typeof item.durationFrames === "number" && item.durationFrames > 0) {
      durationFrames = Math.max(1, Math.round(item.durationFrames));
    } else if (asset.durationSeconds && asset.durationSeconds > 0) {
      durationFrames = Math.max(1, secondsToFrames(Math.min(asset.durationSeconds, 120), fps));
    } else {
      durationFrames = Math.max(1, secondsToFrames(fallbackSec, fps));
    }

    let timelineStartFrame = cursor;
    if (useResolveTiming && typeof item.startFrame === "number") {
      timelineStartFrame = Math.max(0, Math.round(item.startFrame - timelineOrigin));
    }

    const sourceInFrame =
      typeof item.sourceInFrame === "number" && item.sourceInFrame >= 0
        ? Math.round(item.sourceInFrame)
        : 0;

    const clip = {
      id: newId("clip"),
      mediaAssetId: asset.id,
      trackId: video.id,
      timelineStartFrame,
      sourceInFrame,
      durationFrames,
      label: asset.filename || label,
    };
    video.clips.push(clip);
    audio.clips.push({ ...clip, id: newId("clip"), trackId: audio.id });
    cursor = Math.max(cursor, timelineStartFrame + durationFrames);
    matched += 1;
  }

  timeline = ensureDefaultReel(timeline);
  timeline.updatedAt = new Date().toISOString();

  return {
    timeline,
    matched,
    unmatchedNames: [...new Set(unmatchedNames)].slice(0, 40),
    skippedEmpty,
  };
}

export function resolveImportSummary(result: ResolveImportResult): string {
  const parts = [`Imported ${result.matched} clip${result.matched === 1 ? "" : "s"} from Resolve`];
  if (result.unmatchedNames.length) {
    parts.push(`${result.unmatchedNames.length} name(s) didn’t match your media library`);
  }
  return parts.join(". ") + ".";
}

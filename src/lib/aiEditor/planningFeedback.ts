/**
 * V6 — planning feedback from the Resolve cut (vs ShootSpine rough cut + coverage).
 * Deterministic, plain-language; does not rewrite the rough cut.
 */

import { compareResolveToRoughCut } from "@/lib/aiEditor/resolveSync";
import { timelineDurationFrames } from "@/lib/aiEditor/timeline";
import type {
  CoverageReport,
  MediaAsset,
  PlanningFeedback,
  PlanningFeedbackInsight,
  ResolveSyncClip,
  ResolveSyncSnapshot,
  Timeline,
} from "@/lib/aiEditor/types";

export function normalizeClipKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function matchResolveClipToMedia(
  clipName: string,
  media: MediaAsset[]
): MediaAsset | undefined {
  const key = normalizeClipKey(clipName);
  if (!key) return undefined;
  const exact = media.find((m) => {
    const candidates = [m.filename, m.originalFilename, m.clipName, m.reelName].filter(
      Boolean
    ) as string[];
    return candidates.some((c) => normalizeClipKey(c) === key);
  });
  if (exact) return exact;
  if (key.length < 6) return undefined;
  return media.find((m) => {
    const candidates = [m.filename, m.originalFilename, m.clipName, m.reelName].filter(
      Boolean
    ) as string[];
    return candidates.some((c) => {
      const ck = normalizeClipKey(c);
      return ck.length >= 6 && (ck.includes(key) || key.includes(ck));
    });
  });
}

function videoClips(timeline: Timeline | null | undefined) {
  return timeline?.tracks.find((t) => t.kind === "video")?.clips.slice() ?? [];
}

export function buildPlanningFeedback(input: {
  sync: ResolveSyncSnapshot;
  timeline?: Timeline | null;
  media: MediaAsset[];
  coverage?: CoverageReport | null;
}): PlanningFeedback {
  const clips: ResolveSyncClip[] = (input.sync.clips || []).slice(0, 200);
  const rough = videoClips(input.timeline);
  const roughIds = new Set(rough.map((c) => c.mediaAssetId));

  const keptMediaIds: string[] = [];
  const onlyInResolveNames: string[] = [];
  const matchedResolveIds = new Set<string>();

  for (const clip of clips) {
    const asset = matchResolveClipToMedia(clip.name || "", input.media);
    if (asset) {
      matchedResolveIds.add(asset.id);
      if (roughIds.has(asset.id) && !keptMediaIds.includes(asset.id)) {
        keptMediaIds.push(asset.id);
      } else if (!roughIds.has(asset.id) && clip.name) {
        onlyInResolveNames.push(clip.name);
      }
    } else if (clip.name?.trim()) {
      onlyInResolveNames.push(clip.name.trim());
    }
  }

  const droppedFromRough = rough
    .filter((c) => !matchedResolveIds.has(c.mediaAssetId))
    .map((c) => {
      const asset = input.media.find((m) => m.id === c.mediaAssetId);
      return {
        mediaAssetId: c.mediaAssetId,
        label: c.label || asset?.filename || c.mediaAssetId,
      };
    });

  // Dedupe only-in-resolve labels
  const onlyInResolve = [...new Set(onlyInResolveNames)].slice(0, 40);

  const compare = compareResolveToRoughCut({
    sync: input.sync,
    roughCutDurationFrames: input.timeline
      ? timelineDurationFrames(input.timeline)
      : undefined,
    roughCutClipCount: rough.length,
    roughCutFrameRate: input.timeline?.frameRate,
  });

  const insights: PlanningFeedbackInsight[] = [];

  if (compare.lengthHint === "shorter") {
    insights.push({
      id: "shorter_in_resolve",
      severity: "info",
      text: "The Resolve cut is shorter than your rough cut — finishing trimmed the piece further.",
    });
  } else if (compare.lengthHint === "longer") {
    insights.push({
      id: "longer_in_resolve",
      severity: "info",
      text: "The Resolve cut is longer than your rough cut — you kept more (or padded) in finishing.",
    });
  }

  if (clips.length > 0 && droppedFromRough.length > 0) {
    const sample = droppedFromRough
      .slice(0, 3)
      .map((d) => d.label)
      .join(", ");
    insights.push({
      id: "dropped_in_finish",
      severity: "suggest",
      text:
        droppedFromRough.length === 1
          ? `“${sample}” from your rough cut doesn’t show up in Resolve — likely cut in finishing.`
          : `${droppedFromRough.length} rough-cut clips don’t appear in Resolve (e.g. ${sample}). Consider whether they were unused coverage.`,
    });
  }

  if (clips.length > 0 && onlyInResolve.length > 0 && rough.length > 0) {
    insights.push({
      id: "added_in_resolve",
      severity: "info",
      text: `${onlyInResolve.length} Resolve clip name(s) weren’t in your ShootSpine rough cut — you may have pulled extra media in Resolve.`,
    });
  }

  const missingShots =
    input.coverage?.shots.filter((s) => s.status === "missing").slice(0, 8) ?? [];
  if (missingShots.length > 0) {
    const names = missingShots
      .map((s) => s.shotName || s.scene || s.plannedShotId)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
    insights.push({
      id: "missing_coverage",
      severity: "action",
      text:
        input.coverage!.missingCount === 1
          ? `Still missing planned coverage: ${names}. Worth picking up next shoot.`
          : `${input.coverage!.missingCount} planned shots still missing (e.g. ${names}). Flag for the next shoot day.`,
    });
  }

  // Preferred takes that were in rough cut but dropped in Resolve
  if (input.coverage && clips.length > 0) {
    const preferredDropped = input.coverage.shots.filter((s) => {
      const pref = s.preferredMediaAssetId;
      if (!pref) return false;
      return roughIds.has(pref) && !matchedResolveIds.has(pref);
    });
    if (preferredDropped.length > 0) {
      const sample = preferredDropped
        .slice(0, 2)
        .map((s) => s.shotName || s.scene || "shot")
        .join(", ");
      insights.push({
        id: "preferred_dropped",
        severity: "suggest",
        text: `Preferred take(s) for ${sample} didn’t make the Resolve cut — note for selects next time.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "baseline",
      severity: "info",
      text:
        clips.length > 0
          ? "Resolve timeline snapshot saved. No strong planning gaps detected from this cut."
          : "Resolve timeline snapshot saved. Open a timeline with clips for richer next-shoot notes.",
    });
  }

  return {
    timelineName: input.sync.timelineName,
    keptCount: keptMediaIds.length,
    droppedCount: droppedFromRough.length,
    onlyInResolveCount: onlyInResolve.length,
    droppedLabels: droppedFromRough.map((d) => d.label).slice(0, 20),
    onlyInResolveLabels: onlyInResolve.slice(0, 20),
    insights,
    lengthHint: compare.lengthHint,
    updatedAt: new Date().toISOString(),
  };
}

export function summarizePlanningFeedback(
  feedback?: PlanningFeedback | null
): string | null {
  if (!feedback?.insights?.length) return null;
  const first = feedback.insights[0]?.text;
  if (!first) return null;
  const extra = feedback.insights.length - 1;
  return extra > 0 ? `${first} (+${extra} more)` : first;
}

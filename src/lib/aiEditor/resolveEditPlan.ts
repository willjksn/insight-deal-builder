/**
 * V21 — Resolve edit plan: timeline markers + transition intents for handoff.
 * Markers are applied via Desktop Agent after EDL import.
 * Soft blends also go into the EDL as dissolves (best-effort).
 * Grades are never baked — Color stays in Resolve.
 */

import { framesToTimecode } from "@/lib/aiEditor/frames";
import { sortedReels, videoClips } from "@/lib/aiEditor/reels";
import type {
  Timeline,
  TimelineClip,
  TimelineReelKind,
  TransitionType,
} from "@/lib/aiEditor/types";

export const RESOLVE_EDIT_PLAN_FILENAME = "shootspine_edit_plan.json";

export type ResolveMarkerPlan = {
  /** Frame from timeline start (0-based). */
  frame: number;
  color: string;
  name: string;
  note: string;
  durationFrames: number;
};

export type ResolveTransitionPlan = {
  /** Record join frame (end of outgoing clip). */
  atFrame: number;
  type: TransitionType;
  durationFrames: number;
  fromClipId: string;
  toClipId?: string;
  /** Applied in EDL when type is dissolve. */
  edlDissolve: boolean;
};

export type ResolveEditPlan = {
  version: 1;
  frameRate: number;
  timelineName: string;
  markers: ResolveMarkerPlan[];
  transitions: ResolveTransitionPlan[];
  summary: {
    markerCount: number;
    transitionCount: number;
    dissolveInEdl: number;
    markerOnlyTransitions: number;
  };
};

function reelColor(kind: TimelineReelKind): string {
  if (kind === "act") return "Green";
  if (kind === "reel") return "Blue";
  return "Purple";
}

function transitionColor(type: TransitionType): string {
  if (type === "dissolve") return "Cyan";
  if (type === "fade") return "Yellow";
  return "White";
}

function clampDissolveFrames(prev: TimelineClip, next: TimelineClip, requested: number): number {
  const req = Math.max(1, Math.floor(requested || 1));
  const max = Math.min(
    req,
    Math.max(1, Math.floor(prev.durationFrames / 2)),
    Math.max(1, Math.floor(next.durationFrames / 2))
  );
  return Math.max(1, max);
}

/** First timeline frame for a reel (earliest clip with that reelId). */
function reelStartFrame(clips: TimelineClip[], reelId: string): number | null {
  let min: number | null = null;
  for (const c of clips) {
    if (c.reelId !== reelId) continue;
    if (min == null || c.timelineStartFrame < min) min = c.timelineStartFrame;
  }
  return min;
}

/** Build markers + transition intents from the ShootSpine timeline. */
export function buildResolveEditPlan(timeline: Timeline): ResolveEditPlan {
  const fps = timeline.frameRate || 24;
  const clips = [...videoClips(timeline)].sort(
    (a, b) => a.timelineStartFrame - b.timelineStartFrame
  );
  const markers: ResolveMarkerPlan[] = [];
  const transitions: ResolveTransitionPlan[] = [];

  markers.push({
    frame: 0,
    color: "Blue",
    name: "ShootSpine",
    note: `Rough cut v${timeline.version} - finish color in Resolve (no grade baked).`,
    durationFrames: 1,
  });

  for (const reel of sortedReels(timeline)) {
    const start = reelStartFrame(clips, reel.id);
    if (start == null) continue;
    markers.push({
      frame: start,
      color: reelColor(reel.kind),
      name: reel.name.slice(0, 40),
      note: `${reel.kind === "act" ? "Act" : reel.kind === "reel" ? "Reel" : "Group"} · ${framesToTimecode(start, fps)}`,
      durationFrames: 1,
    });
  }

  for (let i = 0; i < clips.length - 1; i++) {
    const from = clips[i]!;
    const to = clips[i + 1]!;
    const t = from.transitionOut;
    if (!t || t.type === "cut" || t.durationFrames <= 0) continue;

    const durationFrames =
      t.type === "dissolve" ? clampDissolveFrames(from, to, t.durationFrames) : Math.max(1, t.durationFrames);
    const atFrame = from.timelineStartFrame + from.durationFrames;
    const edlDissolve = t.type === "dissolve";

    transitions.push({
      atFrame,
      type: t.type,
      durationFrames,
      fromClipId: from.id,
      toClipId: to.id,
      edlDissolve,
    });

    const label = t.type === "dissolve" ? "Dissolve" : "Fade";
    markers.push({
      frame: Math.max(0, atFrame - Math.floor(durationFrames / 2)),
      color: transitionColor(t.type),
      name: label,
      note:
        t.type === "dissolve"
          ? `Cross dissolve ~${durationFrames}f (also in EDL when Resolve accepts it).`
          : `Fade through black ~${durationFrames}f — apply on Edit page if not already present.`,
      durationFrames: Math.max(1, durationFrames),
    });
  }

  // Deduplicate markers on same frame+name (reel start == 0 with ShootSpine)
  const seen = new Set<string>();
  const uniqueMarkers = markers.filter((m) => {
    const key = `${m.frame}|${m.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const dissolveInEdl = transitions.filter((t) => t.edlDissolve).length;
  return {
    version: 1,
    frameRate: fps,
    timelineName: timeline.name,
    markers: uniqueMarkers,
    transitions,
    summary: {
      markerCount: uniqueMarkers.length,
      transitionCount: transitions.length,
      dissolveInEdl,
      markerOnlyTransitions: transitions.length - dissolveInEdl,
    },
  };
}

export function summarizeEditPlanForReadme(plan: ResolveEditPlan): string[] {
  const lines = [
    "Edit plan (V21)",
    "---------------",
    `${plan.summary.markerCount} timeline marker(s): acts/reels + transition cues.`,
  ];
  if (plan.summary.dissolveInEdl > 0) {
    lines.push(
      `${plan.summary.dissolveInEdl} soft blend(s) written into the EDL as dissolves (best-effort).`
    );
  }
  if (plan.summary.markerOnlyTransitions > 0) {
    lines.push(
      `${plan.summary.markerOnlyTransitions} fade beat(s) marked on the timeline — apply fades in Resolve if needed.`
    );
  }
  lines.push("Look/mood stays in LOOKS.txt — ShootSpine does not bake a grade.");
  return lines;
}

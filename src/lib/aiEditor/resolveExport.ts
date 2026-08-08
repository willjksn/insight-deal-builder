/** V1G/V1.6/V21 — portable Resolve handoff (EDL + media manifest + look notes + edit plan). No camera bytes uploaded. */

import { framesToSeconds, framesToTimecode } from "@/lib/aiEditor/frames";
import { buildFinishingGuide } from "@/lib/aiEditor/finishing";
import {
  buildResolveEditPlan,
  summarizeEditPlanForReadme,
  type ResolveEditPlan,
} from "@/lib/aiEditor/resolveEditPlan";
import { timelineDurationFrames } from "@/lib/aiEditor/timeline";
import type { NleHandoffPackage, NleMediaMapping } from "@/lib/aiEditor/nleAdapter";
import type { EditNote, MediaAsset, Timeline, TimelineClip } from "@/lib/aiEditor/types";

const MANIFEST_VERSION = "1.1.0";

function videoClips(timeline: Timeline): TimelineClip[] {
  const clips = timeline.tracks.find((t) => t.kind === "video")?.clips.slice() ?? [];
  clips.sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
  return clips;
}

function reelName(asset: MediaAsset | undefined, clip: TimelineClip): string {
  return (asset?.reelName || asset?.filename || clip.mediaAssetId)
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 32);
}

function clampDissolveFrames(prev: TimelineClip, next: TimelineClip, requested: number): number {
  const req = Math.max(1, Math.floor(requested || 1));
  return Math.max(
    1,
    Math.min(
      req,
      Math.max(1, Math.floor(prev.durationFrames / 2)),
      Math.max(1, Math.floor(next.durationFrames / 2))
    )
  );
}

/** CMX 3600–style EDL (Resolve-friendly). Dissolves when transitionOut is dissolve. */
export function buildEdl(timeline: Timeline, media: MediaAsset[]): string {
  const fps = timeline.frameRate || 24;
  const byId = new Map(media.map((m) => [m.id, m]));
  const clips = videoClips(timeline);
  const lines: string[] = [
    `TITLE: ${timeline.name || "ShootSpine Rough Cut"}`,
    `FCM: NON-DROP FRAME`,
    "",
  ];

  clips.forEach((clip, i) => {
    const asset = byId.get(clip.mediaAssetId);
    const reel = reelName(asset, clip);
    const event = String(i + 1).padStart(3, "0");
    const prev = i > 0 ? clips[i - 1] : null;
    const dissolveFromPrev =
      prev?.transitionOut?.type === "dissolve" && (prev.transitionOut.durationFrames || 0) > 0
        ? clampDissolveFrames(prev, clip, prev.transitionOut.durationFrames)
        : 0;

    let srcInFrame = clip.sourceInFrame;
    let srcOutFrame = clip.sourceInFrame + clip.durationFrames;
    let recInFrame = clip.timelineStartFrame;
    let recOutFrame = clip.timelineStartFrame + clip.durationFrames;
    let editKind: "C" | "D" = "C";
    let dissolvePad = "";

    if (dissolveFromPrev > 0) {
      editKind = "D";
      dissolvePad = String(dissolveFromPrev).padStart(3, "0");
      // Overlap record in by dissolve length (CMX dissolve into this event)
      recInFrame = Math.max(0, clip.timelineStartFrame - dissolveFromPrev);
      // Prefer source handle before in-point when available
      srcInFrame = Math.max(0, clip.sourceInFrame - dissolveFromPrev);
    }

    const srcIn = framesToTimecode(srcInFrame, fps);
    const srcOut = framesToTimecode(srcOutFrame, fps);
    const recIn = framesToTimecode(recInFrame, fps);
    const recOut = framesToTimecode(recOutFrame, fps);
    const reelField = reel.padEnd(8).slice(0, 8);
    if (editKind === "D") {
      lines.push(
        `${event}  ${reelField} V     D    ${dissolvePad} ${srcIn} ${srcOut} ${recIn} ${recOut}`
      );
    } else {
      lines.push(`${event}  ${reelField} V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`);
    }
    if (clip.label || asset?.filename) {
      lines.push(`* FROM CLIP NAME: ${clip.label || asset?.filename}`);
    }
    lines.push(`* SHOOTSPINE_MEDIA_ID: ${clip.mediaAssetId}`);
    if (asset?.relativeProjectPath) {
      lines.push(`* SHOOTSPINE_REL_PATH: ${asset.relativeProjectPath}`);
    }
    if (dissolveFromPrev > 0) {
      lines.push(`* SHOOTSPINE_TRANSITION: dissolve ${dissolveFromPrev}f`);
    } else if (clip.transitionOut && clip.transitionOut.type !== "cut") {
      lines.push(
        `* SHOOTSPINE_TRANSITION_OUT: ${clip.transitionOut.type} ${clip.transitionOut.durationFrames}f`
      );
    }
  });

  return lines.join("\n") + "\n";
}

export function buildMediaMappings(timeline: Timeline, media: MediaAsset[]): NleMediaMapping[] {
  const byId = new Map(media.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const out: NleMediaMapping[] = [];
  for (const clip of videoClips(timeline)) {
    if (seen.has(clip.mediaAssetId)) continue;
    seen.add(clip.mediaAssetId);
    const asset = byId.get(clip.mediaAssetId);
    out.push({
      mediaAssetId: clip.mediaAssetId,
      relativeProjectPath: asset?.relativeProjectPath,
      resolvedPath: asset?.currentPath || asset?.proxyPath,
      checksum: asset?.checksum,
      filename: asset?.filename || clip.label || clip.mediaAssetId,
    });
  }
  return out;
}

export function buildResolveHandoff(input: {
  projectId: string;
  timeline: Timeline;
  media: MediaAsset[];
  projectRoot?: string;
  timelineVersionId?: string;
  editNotes?: EditNote[] | null;
  finishingNote?: string | null;
}): NleHandoffPackage & {
  edl: string;
  readme: string;
  looksGuide?: string;
  editPlan: ResolveEditPlan;
  finishing?: Timeline["finishing"];
  summary: {
    clipCount: number;
    durationTimecode: string;
    durationSeconds: number;
    mediaCount: number;
    markerCount: number;
    dissolveCount: number;
  };
} {
  const { projectId, timeline, media, projectRoot, timelineVersionId } = input;
  const edl = buildEdl(timeline, media);
  const mappings = buildMediaMappings(timeline, media);
  const editPlan = buildResolveEditPlan(timeline);
  const frames = timelineDurationFrames(timeline);
  const clips = videoClips(timeline);
  const summary = {
    clipCount: clips.length,
    durationTimecode: framesToTimecode(frames, timeline.frameRate),
    durationSeconds: framesToSeconds(frames, timeline.frameRate),
    mediaCount: mappings.length,
    markerCount: editPlan.summary.markerCount,
    dissolveCount: editPlan.summary.dissolveInEdl,
  };

  const looksGuide = timeline.finishing
    ? buildFinishingGuide({
        plan: timeline.finishing,
        timelineName: timeline.name,
        clipCount: summary.clipCount,
        editNotes: input.editNotes,
        finishingNote: input.finishingNote,
      })
    : undefined;

  const readme = [
    "ShootSpine → DaVinci Resolve handoff",
    "====================================",
    "",
    "1. Copy/sync the project media folder to the Mac (or mount the same volume).",
    "2. Prefer: python3 import_shootspine_edl.py (Resolve open, External scripting on).",
    "   Links media into a ShootSpine bin, then imports the EDL and timeline markers.",
    "   Or: File → Import → Timeline → Import EDL… → shootspine_rough_cut.edl",
    "3. If clips are offline, relink via shootspine_handoff.json",
    "   (MediaAsset.id + relativeProjectPath + checksum).",
    looksGuide ? "4. Read LOOKS.txt for mood notes (apply grade in Resolve — nothing is baked)." : "",
    "5. See OPEN_ON_MAC.txt for the cross-machine checklist.",
    "",
    ...summarizeEditPlanForReadme(editPlan),
    "",
    `Project: ${projectId}`,
    `Timeline: ${timeline.name} v${timeline.version}`,
    `Duration: ${summary.durationTimecode} @ ${timeline.frameRate} fps`,
    `Clips: ${summary.clipCount}`,
    timeline.finishing
      ? `Look: ${timeline.finishing.moodLabel} · ${timeline.finishing.transitionLabel}`
      : "",
    projectRoot ? `Windows project root (source): ${projectRoot}` : "",
    "",
    "Camera originals are never uploaded by ShootSpine.",
    "Prefer linking to 01_ORIGINAL_MEDIA (or proxies in 02_PROXIES if you edited proxies).",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    shootspineManifestVersion: MANIFEST_VERSION,
    projectId,
    timelineId: timeline.id,
    timelineVersionId,
    target: "resolve",
    media: mappings,
    interchange: { format: "edl", contentOrPath: "shootspine_rough_cut.edl" },
    edl,
    readme,
    looksGuide,
    editPlan,
    finishing: timeline.finishing,
    summary,
  };
}

export class ResolveAdapter {
  readonly id = "resolve" as const;

  build(input: {
    projectId: string;
    timeline: Timeline;
    media: MediaAsset[];
    projectRoot?: string;
    timelineVersionId?: string;
  }) {
    return buildResolveHandoff(input);
  }
}

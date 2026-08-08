/** V1G/V1.6 — portable Resolve handoff (EDL + media manifest + look notes). No camera bytes uploaded. */

import { framesToSeconds, framesToTimecode } from "@/lib/aiEditor/frames";
import { buildFinishingGuide } from "@/lib/aiEditor/finishing";
import { timelineDurationFrames } from "@/lib/aiEditor/timeline";
import type { NleHandoffPackage, NleMediaMapping } from "@/lib/aiEditor/nleAdapter";
import type { EditNote, MediaAsset, Timeline, TimelineClip } from "@/lib/aiEditor/types";

const MANIFEST_VERSION = "1.0.0";

function videoClips(timeline: Timeline): TimelineClip[] {
  const clips = timeline.tracks.find((t) => t.kind === "video")?.clips.slice() ?? [];
  clips.sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
  return clips;
}

/** CMX 3600–style EDL (Resolve-friendly). Timecodes are non-drop at timeline fps. */
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
    const reel = (asset?.reelName || asset?.filename || clip.mediaAssetId)
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 32);
    const event = String(i + 1).padStart(3, "0");
    const srcIn = framesToTimecode(clip.sourceInFrame, fps);
    const srcOut = framesToTimecode(clip.sourceInFrame + clip.durationFrames, fps);
    const recIn = framesToTimecode(clip.timelineStartFrame, fps);
    const recOut = framesToTimecode(clip.timelineStartFrame + clip.durationFrames, fps);
    lines.push(`${event}  ${reel.padEnd(8).slice(0, 8)} V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`);
    if (clip.label || asset?.filename) {
      lines.push(`* FROM CLIP NAME: ${clip.label || asset?.filename}`);
    }
    lines.push(`* SHOOTSPINE_MEDIA_ID: ${clip.mediaAssetId}`);
    if (asset?.relativeProjectPath) {
      lines.push(`* SHOOTSPINE_REL_PATH: ${asset.relativeProjectPath}`);
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
  finishing?: Timeline["finishing"];
  summary: {
    clipCount: number;
    durationTimecode: string;
    durationSeconds: number;
    mediaCount: number;
  };
} {
  const { projectId, timeline, media, projectRoot, timelineVersionId } = input;
  const edl = buildEdl(timeline, media);
  const mappings = buildMediaMappings(timeline, media);
  const frames = timelineDurationFrames(timeline);
  const clips = videoClips(timeline);
  const summary = {
    clipCount: clips.length,
    durationTimecode: framesToTimecode(frames, timeline.frameRate),
    durationSeconds: framesToSeconds(frames, timeline.frameRate),
    mediaCount: mappings.length,
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
    "   Links media into a ShootSpine bin, then imports the EDL.",
    "   Or: File → Import → Timeline → Import EDL… → shootspine_rough_cut.edl",
    "3. If clips are offline, relink via shootspine_handoff.json",
    "   (MediaAsset.id + relativeProjectPath + checksum).",
    looksGuide ? "4. Read LOOKS.txt for mood / transition suggestions (apply in Resolve)." : "",
    "5. See OPEN_ON_MAC.txt for the cross-machine checklist.",
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

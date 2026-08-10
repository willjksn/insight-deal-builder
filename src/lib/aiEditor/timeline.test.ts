import { describe, expect, it } from "vitest";
import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import type { CoverageReport, MediaAsset } from "@/lib/aiEditor/types";
import {
  applyTimelineOp,
  buildRoughCutFromCoverage,
  emptyTimeline,
  summarizeTimeline,
  timelineDurationFrames,
} from "@/lib/aiEditor/timeline";

function media(id: string, filename: string, durationSeconds = 6): MediaAsset {
  return {
    id,
    projectId: "p1",
    userId: "u1",
    filename,
    originalFilename: filename,
    extension: ".mp4",
    mediaType: "video",
    durationSeconds,
    onlineStatus: "online",
    ingestStatus: "indexed",
    analysisStatus: "complete",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("aiEditor timeline", () => {
  it("builds rough cut from preferred takes", () => {
    const coverage: CoverageReport = {
      projectId: "p1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      plannedShotCount: 2,
      coveredCount: 2,
      partialCount: 0,
      missingCount: 0,
      unmatchedMediaIds: [],
      overrides: [],
      shots: [
        {
          plannedShotId: "s1",
          scene: "1",
          shotName: "Wide",
          status: "covered",
          candidates: [],
          preferredMediaAssetId: "m1",
          preferredScore: 0.5,
        },
        {
          plannedShotId: "s2",
          scene: "1",
          shotName: "CU",
          status: "covered",
          candidates: [],
          preferredMediaAssetId: "m2",
          preferredScore: 0.4,
        },
      ],
    };
    const tl = buildRoughCutFromCoverage({
      projectId: "p1",
      coverage,
      media: [media("m1", "sc01_wide.mp4"), media("m2", "sc01_cu.mp4")],
      frameRate: 24,
    });
    const video = tl.tracks.find((t) => t.kind === "video")!;
    expect(video.clips).toHaveLength(2);
    expect(video.clips[0].plannedShotId).toBe("s1");
    expect(timelineDurationFrames(tl)).toBeGreaterThan(0);
    expect(summarizeTimeline(tl).clipCount).toBe(4); // video + audio copies
  });

  it("uses analysis shot breaks for source in/out", () => {
    const coverage: CoverageReport = {
      projectId: "p1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      plannedShotCount: 1,
      coveredCount: 1,
      partialCount: 0,
      missingCount: 0,
      unmatchedMediaIds: [],
      overrides: [],
      shots: [
        {
          plannedShotId: "s1",
          scene: "1",
          shotName: "CU",
          shotType: "close_up",
          status: "covered",
          candidates: [],
          preferredMediaAssetId: "m1",
          preferredScore: 0.5,
        },
      ],
    };
    const analysis: ClipAnalysisBundle[] = [
      {
        mediaAssetId: "m1",
        shots: [
          {
            id: "a0",
            mediaAssetId: "m1",
            index: 0,
            startSeconds: 0,
            endSeconds: 1,
            confidence: 0.5,
            shotSize: "unknown",
          },
          {
            id: "a1",
            mediaAssetId: "m1",
            index: 1,
            startSeconds: 5,
            endSeconds: 11,
            confidence: 0.85,
            shotSize: "close_up",
          },
        ],
        transcript: [],
        analysisStatus: "complete",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const tl = buildRoughCutFromCoverage({
      projectId: "p1",
      coverage,
      media: [media("m1", "take.mp4", 20)],
      analysis,
      frameRate: 24,
    });
    const clip = tl.tracks.find((t) => t.kind === "video")!.clips[0]!;
    expect(clip.sourceInFrame).toBeGreaterThan(0);
    expect(clip.durationFrames).toBeGreaterThan(24);
  });

  it("skips camera JPG stills in footage-only rough cut", () => {
    const coverage: CoverageReport = {
      projectId: "p1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      plannedShotCount: 0,
      coveredCount: 0,
      partialCount: 0,
      missingCount: 0,
      unmatchedMediaIds: [],
      overrides: [],
      shots: [],
    };
    const jpg: MediaAsset = {
      ...media("j1", "C0042T01.JPG", 0.5),
      extension: ".jpg",
      mediaType: "video", // ffprobe mislabel
    };
    const tl = buildRoughCutFromCoverage({
      projectId: "p1",
      coverage,
      media: [media("m1", "C0042.MP4", 12), jpg],
      frameRate: 24,
    });
    const video = tl.tracks.find((t) => t.kind === "video")!;
    expect(video.clips).toHaveLength(1);
    expect(video.clips[0].label).toBe("C0042.MP4");
  });

  it("applies ripple delete and trim", () => {
    let tl = emptyTimeline({ projectId: "p1", frameRate: 24 });
    const video = tl.tracks.find((t) => t.kind === "video")!;
    tl = applyTimelineOp(tl, {
      type: "insert",
      trackId: video.id,
      mediaAssetId: "m1",
      durationFrames: 48,
      label: "A",
    });
    tl = applyTimelineOp(tl, {
      type: "insert",
      trackId: video.id,
      mediaAssetId: "m2",
      durationFrames: 24,
      label: "B",
    });
    const first = tl.tracks.find((t) => t.kind === "video")!.clips[0];
    tl = applyTimelineOp(tl, { type: "trim", clipId: first.id, durationFrames: 12 });
    expect(tl.tracks.find((t) => t.kind === "video")!.clips[0].durationFrames).toBe(12);
    tl = applyTimelineOp(tl, { type: "rippleDelete", clipId: first.id });
    const clips = tl.tracks.find((t) => t.kind === "video")!.clips;
    expect(clips).toHaveLength(1);
    expect(clips[0].timelineStartFrame).toBe(0);
  });
});

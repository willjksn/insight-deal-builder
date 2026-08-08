import { describe, expect, it } from "vitest";
import {
  buildPlanningFeedback,
  matchResolveClipToMedia,
  normalizeClipKey,
} from "@/lib/aiEditor/planningFeedback";
import type { CoverageReport, MediaAsset, Timeline } from "@/lib/aiEditor/types";

function media(id: string, filename: string): MediaAsset {
  return {
    id,
    projectId: "p1",
    userId: "u1",
    filename,
    originalFilename: filename,
    extension: "mp4",
    mediaType: "video",
    onlineStatus: "online",
    ingestStatus: "verified",
    analysisStatus: "none",
    createdAt: "",
    updatedAt: "",
  };
}

function timeline(ids: string[]): Timeline {
  return {
    id: "t1",
    projectId: "p1",
    name: "Rough",
    frameRate: 24,
    version: 1,
    tracks: [
      {
        id: "v1",
        kind: "video",
        name: "V1",
        clips: ids.map((mediaAssetId, i) => ({
          id: `c${i}`,
          mediaAssetId,
          trackId: "v1",
          timelineStartFrame: i * 24,
          durationFrames: 24,
          sourceInFrame: 0,
          label: undefined,
        })),
      },
    ],
    createdAt: "",
    updatedAt: "",
  };
}

describe("planningFeedback", () => {
  it("normalizes clip keys", () => {
    expect(normalizeClipKey("Take_02.MOV")).toBe("take_02");
  });

  it("matches resolve clip names to media", () => {
    const assets = [media("a", "scene08_wide.mp4"), media("b", "react_cu.mov")];
    expect(matchResolveClipToMedia("scene08_wide", assets)?.id).toBe("a");
  });

  it("flags dropped rough-cut clips and missing coverage", () => {
    const assets = [media("a", "keep.mp4"), media("b", "drop.mp4")];
    const fb = buildPlanningFeedback({
      sync: {
        timelineName: "Final",
        durationFrames: 48,
        videoClipCount: 1,
        clips: [{ name: "keep.mp4", durationFrames: 48 }],
      },
      timeline: timeline(["a", "b"]),
      media: assets,
      coverage: {
        projectId: "p1",
        updatedAt: "",
        plannedShotCount: 2,
        coveredCount: 1,
        partialCount: 0,
        missingCount: 1,
        unmatchedMediaIds: [],
        shots: [
          {
            plannedShotId: "s1",
            shotName: "Insert shelf",
            status: "missing",
            candidates: [],
          },
        ],
        overrides: [],
      } satisfies CoverageReport,
    });

    expect(fb.droppedCount).toBe(1);
    expect(fb.droppedLabels[0]).toMatch(/drop/i);
    expect(fb.insights.some((i) => i.id === "dropped_in_finish")).toBe(true);
    expect(fb.insights.some((i) => i.id === "missing_coverage")).toBe(true);
  });
});

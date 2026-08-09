import { describe, expect, it } from "vitest";
import { applyFinishingPlan } from "@/lib/aiEditor/finishing";
import { buildResolveEditPlan } from "@/lib/aiEditor/resolveEditPlan";
import { buildRoughCutFromCoverage } from "@/lib/aiEditor/timeline";
import type { CoverageReport, MediaAsset } from "@/lib/aiEditor/types";

function media(id: string, filename: string): MediaAsset {
  return {
    id,
    projectId: "p1",
    userId: "u1",
    filename,
    originalFilename: filename,
    extension: ".mp4",
    mediaType: "video",
    durationSeconds: 6,
    relativeProjectPath: `01_ORIGINAL_MEDIA/CAMERA_A/${filename}`,
    checksum: "abc",
    onlineStatus: "online",
    ingestStatus: "verified",
    analysisStatus: "complete",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function twoClipTimeline() {
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
        shotName: "A",
        status: "covered",
        candidates: [],
        preferredMediaAssetId: "m1",
      },
      {
        plannedShotId: "s2",
        shotName: "B",
        status: "covered",
        candidates: [],
        preferredMediaAssetId: "m2",
      },
    ],
  };
  return buildRoughCutFromCoverage({
    projectId: "p1",
    coverage,
    media: [media("m1", "a.mp4"), media("m2", "b.mp4")],
    frameRate: 24,
  });
}

describe("buildResolveEditPlan", () => {
  it("adds start marker and dissolve transition markers", () => {
    const base = twoClipTimeline();
    const { timeline } = applyFinishingPlan(base, {
      moodId: "natural",
      transitionStyle: "soft_dissolves",
    });
    const plan = buildResolveEditPlan(timeline);
    expect(plan.markers.some((m) => m.name === "ShootSpine")).toBe(false);
    expect(plan.transitions.length).toBe(1);
    expect(plan.transitions[0]?.edlDissolve).toBe(true);
    expect(plan.markers.some((m) => m.name === "Dissolve")).toBe(true);
    expect(plan.summary.dissolveInEdl).toBe(1);
  });

  it("marks fades without EDL dissolve", () => {
    const base = twoClipTimeline();
    const { timeline } = applyFinishingPlan(base, {
      moodId: "warm",
      transitionStyle: "fade_between",
    });
    const plan = buildResolveEditPlan(timeline);
    expect(plan.transitions[0]?.edlDissolve).toBe(false);
    expect(plan.markers.some((m) => m.name === "Fade")).toBe(true);
  });

  it("adds reel markers", () => {
    const base = twoClipTimeline();
    const withReels = {
      ...base,
      reels: [
        { id: "r1", name: "Act 1", kind: "act" as const, sortOrder: 0 },
        { id: "r2", name: "Act 2", kind: "act" as const, sortOrder: 1 },
      ],
      tracks: base.tracks.map((t) =>
        t.kind !== "video"
          ? t
          : {
              ...t,
              clips: t.clips.map((c, i) => ({
                ...c,
                reelId: i === 0 ? "r1" : "r2",
              })),
            }
      ),
    };
    const plan = buildResolveEditPlan(withReels);
    expect(plan.markers.some((m) => m.name === "Act 1" && m.color === "Green")).toBe(true);
    expect(plan.markers.some((m) => m.name === "Act 2")).toBe(true);
  });
});

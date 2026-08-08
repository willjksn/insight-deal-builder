import { describe, expect, it } from "vitest";
import {
  parseEditCommandRules,
  validateTimelineOps,
} from "@/lib/aiEditor/editByChat";
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
    durationSeconds: 8,
    onlineStatus: "online",
    ingestStatus: "indexed",
    analysisStatus: "complete",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function sampleTimeline() {
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
        shotName: "Wide",
        status: "covered",
        candidates: [],
        preferredMediaAssetId: "m1",
      },
      {
        plannedShotId: "s2",
        shotName: "Close",
        status: "covered",
        candidates: [],
        preferredMediaAssetId: "m2",
      },
    ],
  };
  return buildRoughCutFromCoverage({
    projectId: "p1",
    coverage,
    media: [media("m1", "wide.mp4"), media("m2", "close.mp4")],
    frameRate: 24,
  });
}

describe("editByChat", () => {
  it("parses remove first clip", () => {
    const tl = sampleTimeline();
    const proposal = parseEditCommandRules("remove the first clip", tl, []);
    expect(proposal?.ops).toHaveLength(1);
    expect(proposal?.ops[0].type).toBe("rippleDelete");
    const v = validateTimelineOps(tl, proposal!.ops);
    expect(v.ok).toBe(true);
  });

  it("parses trim to seconds", () => {
    const tl = sampleTimeline();
    const proposal = parseEditCommandRules("trim first clip to 2 seconds", tl, []);
    expect(proposal?.ops[0]).toMatchObject({ type: "trim", durationFrames: 48 });
  });

  it("parses reverse order", () => {
    const tl = sampleTimeline();
    const proposal = parseEditCommandRules("reverse the order", tl, []);
    expect(proposal?.ops[0].type).toBe("reorder");
  });

  it("parses undo", () => {
    const tl = sampleTimeline();
    const proposal = parseEditCommandRules("undo", tl, []);
    expect(proposal?.action).toBe("undo");
  });

  it("rejects invalid clip delete on validate", () => {
    const tl = sampleTimeline();
    const v = validateTimelineOps(tl, [{ type: "rippleDelete", clipId: "nope" }]);
    expect(v.ok).toBe(false);
  });
});

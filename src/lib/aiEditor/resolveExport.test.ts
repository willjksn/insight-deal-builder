import { describe, expect, it } from "vitest";
import { buildEdl, buildResolveHandoff } from "@/lib/aiEditor/resolveExport";
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

describe("resolveExport", () => {
  it("builds EDL with shootspine media comments", () => {
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
          shotName: "Wide",
          status: "covered",
          candidates: [],
          preferredMediaAssetId: "m1",
        },
      ],
    };
    const timeline = buildRoughCutFromCoverage({
      projectId: "p1",
      coverage,
      media: [media("m1", "sc01.mp4")],
      frameRate: 24,
    });
    const edl = buildEdl(timeline, [media("m1", "sc01.mp4")]);
    expect(edl).toContain("TITLE:");
    expect(edl).toContain("SHOOTSPINE_MEDIA_ID: m1");
    expect(edl).toContain("01_ORIGINAL_MEDIA");

    const pack = buildResolveHandoff({
      projectId: "p1",
      timeline,
      media: [media("m1", "sc01.mp4")],
      projectRoot: "D:\\Shoots\\P1",
    });
    expect(pack.target).toBe("resolve");
    expect(pack.summary.clipCount).toBe(1);
    expect(pack.media[0].relativeProjectPath).toContain("CAMERA_A");
    expect(pack.readme).toContain("Import EDL");
  });
});

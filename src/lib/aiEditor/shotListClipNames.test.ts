import { describe, expect, it } from "vitest";
import {
  buildShotListClipBasename,
  looksLikeShotListFilename,
  planPreferredTakeRenames,
} from "@/lib/aiEditor/shotListClipNames";
import type { CoverageReport, MediaAsset, ProductionContext } from "@/lib/aiEditor/types";

function media(partial: Partial<MediaAsset> & { id: string; filename: string }): MediaAsset {
  return {
    projectId: "p1",
    userId: "u1",
    originalFilename: partial.filename,
    extension: ".mp4",
    mediaType: "video",
    onlineStatus: "online",
    ingestStatus: "indexed",
    analysisStatus: "complete",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("shotListClipNames", () => {
  it("builds shot_01_Approach style names", () => {
    expect(
      buildShotListClipBasename({
        contentPlanShotId: "shot_01",
        shotName: "Approach",
        extension: ".mp4",
      })
    ).toBe("shot_01_Approach.mp4");
    expect(
      buildShotListClipBasename({
        scoutShotNumber: 2,
        shotName: "Product hero",
        cameraAssignment: "CAMERA_A",
        extension: "mov",
      })
    ).toBe("shot_02_Product_hero_camA.mov");
  });

  it("detects already-named clips", () => {
    expect(looksLikeShotListFilename("shot_01_Approach.mp4")).toBe(true);
    expect(looksLikeShotListFilename("C0019.mp4")).toBe(false);
  });

  it("plans renames for preferred takes only", () => {
    const context: ProductionContext = {
      projectId: "p1",
      projectName: "Spot",
      scenes: [],
      characters: [],
      locations: [],
      people: [],
      shootDays: [],
      shots: [
        {
          id: "board-1",
          shotName: "Approach",
          scoutShotNumber: 1,
          contentPlanShotId: "shot_01",
          hasFrame: false,
        },
      ],
      shotCount: 1,
      framedShotCount: 0,
    };
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
          plannedShotId: "board-1",
          shotName: "Approach",
          status: "covered",
          preferredMediaAssetId: "m1",
          candidates: [],
        },
      ],
    };
    const patches = planPreferredTakeRenames({
      coverage,
      context,
      media: [media({ id: "m1", filename: "C0019.MP4", cameraAssignment: "CAMERA_A" })],
    });
    expect(patches).toHaveLength(1);
    expect(patches[0]?.filename).toBe("shot_01_Approach_camA.mp4");
    expect(patches[0]?.originalFilename).toBe("C0019.MP4");
    expect(patches[0]?.clipName).toBe("shot_01_Approach_camA");
  });

  it("skips clips that already look named", () => {
    const context: ProductionContext = {
      projectId: "p1",
      projectName: "Spot",
      scenes: [],
      characters: [],
      locations: [],
      people: [],
      shootDays: [],
      shots: [
        {
          id: "board-1",
          shotName: "Approach",
          contentPlanShotId: "shot_01",
          hasFrame: false,
        },
      ],
      shotCount: 1,
      framedShotCount: 0,
    };
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
          plannedShotId: "board-1",
          status: "covered",
          preferredMediaAssetId: "m1",
          candidates: [],
        },
      ],
    };
    const patches = planPreferredTakeRenames({
      coverage,
      context,
      media: [media({ id: "m1", filename: "shot_01_Approach.mp4" })],
    });
    expect(patches).toHaveLength(0);
  });
});

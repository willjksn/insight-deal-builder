import { describe, expect, it } from "vitest";
import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import {
  buildCoverageReport,
  cameraClipSequence,
  compareClipRecency,
  jaccard,
  normalizeShotSize,
  scoreClipAgainstShot,
  scoreOnSetTakeInClipText,
  scoreShotNumberInClipText,
  tokenize,
} from "@/lib/aiEditor/matching";
import type { MediaAsset, ProductionContext } from "@/lib/aiEditor/types";

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

describe("aiEditor matching", () => {
  it("tokenizes and scores jaccard", () => {
    expect(tokenize("Scene 7A Wide Shot")).toContain("7a");
    expect(jaccard(["hello", "world"], ["hello", "there"])).toBeCloseTo(1 / 3, 5);
  });

  it("normalizes shot sizes", () => {
    expect(normalizeShotSize("CU")).toBe("close_up");
    expect(normalizeShotSize("Wide Shot")).toBe("wide");
    expect(normalizeShotSize("MCU")).toBe("medium");
  });

  it("reads camera clip sequence and prefers later clips", () => {
    expect(cameraClipSequence("C0003.MP4")).toBe(3);
    expect(cameraClipSequence("A001C012_240101.MXF")).toBe(12);
    const early = media({
      id: "e",
      filename: "C0001.MP4",
      creationTime: "2026-01-01T10:00:00.000Z",
    });
    const late = media({
      id: "l",
      filename: "C0004.MP4",
      creationTime: "2026-01-01T10:05:00.000Z",
    });
    expect(compareClipRecency(early, late)).toBeGreaterThan(0);
  });

  it("prefers later near-tied clip when on-set takes are logged", () => {
    const context: ProductionContext = {
      projectId: "p1",
      projectName: "Sip",
      scenes: [],
      characters: [],
      locations: [],
      people: [],
      shootDays: [],
      shots: [
        {
          id: "shot1",
          scene: "1",
          shotName: "Approach",
          scoutShotNumber: 1,
          onSetTakes: [1, 2],
          hasFrame: false,
        },
      ],
      shotCount: 1,
      framedShotCount: 0,
    };
    const mediaList = [
      media({
        id: "m-early",
        filename: "C0001_Approach.mp4",
        durationSeconds: 5,
        creationTime: "2026-01-01T10:00:00.000Z",
      }),
      media({
        id: "m-late",
        filename: "C0003_Approach.mp4",
        durationSeconds: 5,
        creationTime: "2026-01-01T10:03:00.000Z",
      }),
    ];
    const report = buildCoverageReport({
      projectId: "p1",
      context,
      media: mediaList,
      analysis: [],
    });
    expect(report.shots[0]?.preferredMediaAssetId).toBe("m-late");
    expect(report.shots[0]?.preferredReason).toMatch(/later clip/i);
  });

  it("scores on-set take hints in filenames", () => {
    expect(scoreOnSetTakeInClipText("C001_take_02_camA.mp4", [2]).score).toBeGreaterThan(0.1);
    expect(scoreOnSetTakeInClipText("clip_T03.mp4", [3]).reason).toMatch(/take 3/i);
    expect(scoreOnSetTakeInClipText("random.mp4", [1]).score).toBe(0);

    const m = media({
      id: "m-take",
      filename: "shot_01_take2_Approach.mp4",
      durationSeconds: 4,
    });
    const { score, reasons } = scoreClipAgainstShot({
      media: m,
      shot: {
        id: "board-uuid",
        scene: "1",
        shotName: "Approach",
        scoutShotNumber: 1,
        onSetTakes: [2],
        hasFrame: false,
      },
    });
    expect(score).toBeGreaterThan(0.2);
    expect(reasons.some((r) => /on-set take/i.test(r))).toBe(true);
  });

  it("scores content-plan shot numbers and ids in filenames", () => {
    expect(scoreShotNumberInClipText("C001_shot_01_Approach.mp4", 1, "shot_01").score).toBeGreaterThan(
      0.3
    );
    expect(scoreShotNumberInClipText("reel/S02_product.mp4", 2).reason).toMatch(/S02|Shot 2/i);
    expect(scoreShotNumberInClipText("random_bts.mp4", 1).score).toBe(0);

    const m = media({
      id: "m-cp",
      filename: "shot_01_Approach_camA.mp4",
      durationSeconds: 4,
    });
    const { score, reasons } = scoreClipAgainstShot({
      media: m,
      shot: {
        id: "board-uuid",
        scene: "1",
        shotName: "Approach",
        shotType: "MS",
        scoutShotNumber: 1,
        contentPlanShotId: "shot_01",
        hasFrame: false,
      },
    });
    expect(score).toBeGreaterThan(0.35);
    expect(reasons.some((r) => /shot|approach|content plan/i.test(r))).toBe(true);
  });

  it("scores filename scene + dialogue overlap", () => {
    const m = media({
      id: "m1",
      filename: "sc07a_interview_camA.mp4",
      cameraAssignment: "CAMERA_A",
      durationSeconds: 12,
    });
    const bundle: ClipAnalysisBundle = {
      mediaAssetId: "m1",
      shots: [
        {
          id: "s1",
          mediaAssetId: "m1",
          index: 0,
          startSeconds: 0,
          endSeconds: 12,
          confidence: 0.7,
          shotSize: "medium",
        },
      ],
      transcript: [
        {
          id: "t1",
          mediaAssetId: "m1",
          startSeconds: 0,
          endSeconds: 4,
          text: "Hello from Shoot Spine",
          confidence: 0.8,
        },
      ],
      analysisStatus: "complete",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const { score, reasons } = scoreClipAgainstShot({
      media: m,
      bundle,
      shot: {
        id: "shot1",
        scene: "7A",
        shotName: "Interview MS",
        shotType: "MS",
        camera: "A",
        description: "Talent interview",
        hasFrame: false,
      },
      dialogueLines: [{ character: "HOST", line: "Hello from Shoot Spine" }],
    });
    expect(score).toBeGreaterThan(0.3);
    expect(reasons.some((r) => /scene|dialogue|shot size|camera/i.test(r))).toBe(true);
  });

  it("builds coverage with preferred take and override", () => {
    const context: ProductionContext = {
      projectId: "p1",
      projectName: "Test",
      scenes: [],
      characters: [],
      locations: [],
      people: [],
      shootDays: [],
      shots: [
        {
          id: "shot1",
          scene: "1",
          shotName: "Wide establish",
          shotType: "WS",
          hasFrame: false,
        },
      ],
      shotCount: 1,
      framedShotCount: 0,
    };
    const mediaList = [
      media({ id: "m1", filename: "scene1_wide.mp4", durationSeconds: 8 }),
      media({ id: "m2", filename: "BTS_lunch.mp4", durationSeconds: 30 }),
    ];
    const analysis: ClipAnalysisBundle[] = [
      {
        mediaAssetId: "m1",
        shots: [
          {
            id: "a",
            mediaAssetId: "m1",
            index: 0,
            startSeconds: 0,
            endSeconds: 8,
            confidence: 0.5,
            shotSize: "wide",
          },
        ],
        transcript: [],
        analysisStatus: "complete",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const report = buildCoverageReport({
      projectId: "p1",
      context,
      media: mediaList,
      analysis,
    });
    expect(report.plannedShotCount).toBe(1);
    expect(report.coveredCount + report.partialCount).toBeGreaterThanOrEqual(1);
    expect(report.shots[0].preferredMediaAssetId).toBe("m1");

    const overridden = buildCoverageReport({
      projectId: "p1",
      context,
      media: mediaList,
      analysis,
      overrides: [{ plannedShotId: "shot1", mediaAssetId: "m2" }],
    });
    expect(overridden.shots[0].preferredMediaAssetId).toBe("m2");
    expect(overridden.shots[0].preferredManual).toBe(true);
  });
});

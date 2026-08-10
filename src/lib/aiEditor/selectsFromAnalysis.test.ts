import { describe, expect, it } from "vitest";
import type { ShotSegment } from "@/lib/aiEditor/analysis";
import { selectWindowFromAnalysis } from "@/lib/aiEditor/selectsFromAnalysis";

function seg(
  partial: Partial<ShotSegment> &
    Pick<ShotSegment, "index" | "startSeconds" | "endSeconds">
): ShotSegment {
  return {
    id: `s${partial.index}`,
    mediaAssetId: "m1",
    confidence: 0.7,
    shotSize: "unknown",
    ...partial,
  };
}

describe("selectWindowFromAnalysis", () => {
  it("falls back to head of file without segments", () => {
    const w = selectWindowFromAnalysis({ assetDurationSeconds: 30 });
    expect(w.sourceInSeconds).toBe(0);
    expect(w.durationSeconds).toBe(12);
    expect(w.reason).toMatch(/no shot breaks/i);
  });

  it("skips short head segment and picks body", () => {
    const w = selectWindowFromAnalysis({
      assetDurationSeconds: 20,
      segments: [
        seg({ index: 0, startSeconds: 0, endSeconds: 1.0, shotSize: "unknown" }),
        seg({ index: 1, startSeconds: 1.0, endSeconds: 9.0, shotSize: "medium", confidence: 0.8 }),
        seg({ index: 2, startSeconds: 9.0, endSeconds: 20, shotSize: "close_up" }),
      ],
    });
    expect(w.sourceInSeconds).toBeGreaterThanOrEqual(1);
    expect(w.durationSeconds).toBeGreaterThan(5);
  });

  it("prefers segment matching planned shot size", () => {
    const w = selectWindowFromAnalysis({
      assetDurationSeconds: 18,
      plannedShotType: "CU",
      segments: [
        seg({ index: 0, startSeconds: 0, endSeconds: 8, shotSize: "wide", confidence: 0.9 }),
        seg({
          index: 1,
          startSeconds: 8,
          endSeconds: 14,
          shotSize: "close_up",
          confidence: 0.75,
        }),
      ],
    });
    expect(w.sourceInSeconds).toBe(8);
    expect(w.reason).toMatch(/close_up/i);
  });
});

import { describe, expect, it } from "vitest";
import {
  mergeBoardCoverageFromScript,
  mergeShotPreserveManual,
} from "@/lib/production/coverageSync";
import type { ProductionDay, ProductionDayShot } from "@/lib/production/types";
import type { ScriptDocument } from "@/lib/scriptWriter/types";

function shot(partial: Partial<ProductionDayShot> & Pick<ProductionDayShot, "id" | "label">): ProductionDayShot {
  return {
    done: false,
    sortOrder: 0,
    ...partial,
  };
}

describe("coverageSync", () => {
  it("preserves uploaded frame and lens on merge", () => {
    const existing = shot({
      id: "keep",
      label: "1. Hero",
      scoutShotNumber: 1,
      lens: "50mm",
      referenceImageUrl: "https://example.com/frame.jpg",
      referenceImageSource: "upload",
      done: true,
    });
    const incoming = shot({
      id: "new",
      label: "1. Wide",
      scoutShotNumber: 1,
      lens: "35mm",
      description: "From script",
    });
    const merged = mergeShotPreserveManual(existing, incoming);
    expect(merged.id).toBe("keep");
    expect(merged.done).toBe(true);
    expect(merged.referenceImageUrl).toBe("https://example.com/frame.jpg");
    expect(merged.lens).toBe("50mm");
    expect(merged.description).toBe("From script");
  });

  it("keeps shot on its day when refreshing board", () => {
    const days: ProductionDay[] = [
      {
        id: "d1",
        title: "Day 1",
        dayNumber: 1,
        scenes: [],
        schedule: [],
        shots: [
          shot({ id: "a", label: "1", scoutShotNumber: 1, sortOrder: 0 }),
        ],
      },
      {
        id: "d2",
        title: "Day 2",
        dayNumber: 2,
        scenes: [],
        schedule: [],
        shots: [
          shot({
            id: "b",
            label: "2",
            scoutShotNumber: 2,
            sortOrder: 0,
            referenceImageUrl: "https://example.com/b.jpg",
            referenceImageSource: "upload",
          }),
        ],
      },
    ];
    const script = {
      title: "T",
      logline: "",
      fountain: "",
      scenes: [],
      characters: [],
      suggestedShots: [
        { sceneNumber: "1", shotNumber: 1, shotType: "master_wide", description: "A" },
        { sceneNumber: "1", shotNumber: 2, shotType: "close_up", description: "B" },
      ],
    } as ScriptDocument;

    const next = mergeBoardCoverageFromScript(days, script);
    expect(next[0].shots.some((s) => s.scoutShotNumber === 1)).toBe(true);
    expect(next[1].shots.some((s) => s.scoutShotNumber === 2)).toBe(true);
    expect(next[1].shots.find((s) => s.scoutShotNumber === 2)?.referenceImageUrl).toBe(
      "https://example.com/b.jpg"
    );
  });
});

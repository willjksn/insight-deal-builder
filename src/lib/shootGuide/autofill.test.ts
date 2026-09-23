import { describe, expect, it } from "vitest";
import {
  applyShotSequence,
  buildOverview,
  buildShotSequence,
  hydrateGuideIfNeeded,
  isThinOverview,
  shotsNeedAutofill,
} from "./autofill";
import { createGuideDocument, emptyShot } from "./defaults";

describe("buildOverview", () => {
  it("writes a usable plan from the treadmill inputs instead of empty homework", () => {
    const overview = buildOverview({
      prompt: "Stormi is on the treadmill working out. Create a cinematic workout sequence showing effort and confidence.",
      creativeIntent: "cinematic",
      visualPriorities: ["movement", "emotion"],
      shotCount: 5,
      useMyEquipment: true,
    });
    expect(overview.visualObjective.toLowerCase()).toMatch(/emotion|effort|motion/);
    expect(overview.visualStrategy).not.toMatch(/sprint|generated/i);
    expect(overview.visualStrategy.toLowerCase()).toMatch(/wide|closer|hero|coverage/);
    expect(overview.gearSummary.toLowerCase()).toMatch(/own|catalog/);
    expect(overview.recommendedShotCount).toBe(5);
  });
});

describe("buildShotSequence", () => {
  it("seeds five purposeful shots for a movement + emotion scene", () => {
    const sequence = buildShotSequence(5, ["movement", "emotion"], "cinematic");
    expect(sequence).toHaveLength(5);
    expect(sequence[0].title.toLowerCase()).toMatch(/establish/);
    expect(sequence[4].title.toLowerCase()).toMatch(/hero|finish/);
    expect(sequence.every((s) => s.purpose.length > 20)).toBe(true);
  });
});

describe("hydrateGuideIfNeeded", () => {
  it("fills a thin saved shell so existing guides are not blank forms", () => {
    const doc = createGuideDocument("user-1", {
      sourceType: "quick_scene",
      prompt: "Stormi is on the treadmill working out.",
      visualPriorities: ["movement", "emotion"],
      shotCountMode: "5",
      useMyEquipment: true,
    });
    expect(hydrateGuideIfNeeded({ ...doc, id: "g1", createdAt: "", updatedAt: "" })).toBeNull();

    const thinShots = Array.from({ length: 5 }, (_, i) => emptyShot(i + 1));
    expect(shotsNeedAutofill(thinShots)).toBe(true);
    const filled = applyShotSequence(thinShots, buildShotSequence(5, ["movement"], "cinematic"));
    expect(filled[0].title).not.toMatch(/^Shot /);

    expect(
      isThinOverview({
        sceneSummary: "x",
        toneStyle: "cinematic",
        visualObjective: "Prioritize movement, emotion.",
        recommendedShotCount: 5,
        visualStrategy: "Shot purposes will be generated in the next Sprint.",
        gearSummary: "Will match when shots are generated.",
      })
    ).toBe(true);
  });
});

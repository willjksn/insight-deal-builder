import { describe, expect, it } from "vitest";
import {
  AUTO_SHOT_COUNT,
  buildOverview,
  createGuideDocument,
  normalizeCreateInput,
  resolveShotCount,
  titleFromPrompt,
} from "./defaults";
import { presetFromToneStyle } from "./types";

describe("resolveShotCount", () => {
  it("maps presets and clamps custom values", () => {
    expect(resolveShotCount("auto")).toBe(AUTO_SHOT_COUNT);
    expect(resolveShotCount("3")).toBe(3);
    expect(resolveShotCount("8")).toBe(8);
    expect(resolveShotCount("custom", 12)).toBe(12);
    expect(resolveShotCount("custom", 0)).toBe(AUTO_SHOT_COUNT);
  });
});

describe("titleFromPrompt", () => {
  it("uses the first sentence and truncates long copy", () => {
    expect(titleFromPrompt("Stormi is on the treadmill working out. More later.")).toBe(
      "Stormi is on the treadmill working out"
    );
    expect(titleFromPrompt("")).toBe("Untitled scene");
  });
});

describe("presetFromToneStyle", () => {
  it("maps named presets, stored custom, and free text", () => {
    expect(presetFromToneStyle("cinematic")).toBe("cinematic");
    expect(presetFromToneStyle("Horror")).toBe("horror");
    expect(presetFromToneStyle("polished / intimate", "custom")).toBe("custom");
    expect(presetFromToneStyle("polished / intimate")).toBe("custom");
    expect(presetFromToneStyle("not set yet")).toBe("cinematic");
  });
});

describe("createGuideDocument", () => {
  it("builds a persistable shell with placeholder shots and future arrays", () => {
    const doc = createGuideDocument("user-1", {
      sourceType: "quick_scene",
      prompt: "Stormi is on the treadmill working out.",
      visualPriorities: ["movement", "emotion"],
      shotCountMode: "5",
      useMyEquipment: true,
    });
    expect(doc.userId).toBe("user-1");
    expect(doc.sourceType).toBe("quick_scene");
    expect(doc.shots).toHaveLength(5);
    expect(doc.shots[0].shotNumber).toBe(1);
    expect(doc.shots[0].takeRecords).toEqual([]);
    expect(doc.checklist).toEqual([]);
    expect(doc.slateRecords).toEqual([]);
    expect(doc.continuityRecords).toEqual([]);
    expect(doc.useMyEquipment).toBe(true);
    expect(doc.showIdealWhenNotOwned).toBe(true);
    expect(doc.overview.recommendedShotCount).toBe(5);
    expect(doc.overview.visualStrategy).not.toMatch(/sprint/i);
    expect(doc.shots[0].title).not.toMatch(/^Shot /);
    expect(doc.setup.lightingNotes.length).toBeGreaterThan(20);
  });

  it("allows a blank guide without a prompt", () => {
    const input = normalizeCreateInput({ sourceType: "blank" });
    expect(input.prompt).toBe("");
    expect(input.title).toBe("Untitled scene");
    const overview = buildOverview({
      prompt: "",
      creativeIntent: "cinematic",
      visualPriorities: [],
      shotCount: 5,
      useMyEquipment: false,
    });
    expect(overview.sceneSummary).toContain("No scene description");
  });
});

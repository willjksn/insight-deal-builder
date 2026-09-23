import { describe, expect, it } from "vitest";
import { buildChecklistFromGuide, mergeChecklist } from "./checklist";
import { createGuideDocument } from "./defaults";
import { CHECKLIST_GROUPS } from "./types";

describe("buildChecklistFromGuide", () => {
  it("builds scene-specific groups for the treadmill prompt", () => {
    const doc = createGuideDocument("u1", {
      sourceType: "quick_scene",
      prompt: "Stormi is on the treadmill working out. Cinematic effort and confidence.",
      visualPriorities: ["movement", "emotion"],
      shotCountMode: "5",
      useMyEquipment: true,
    });
    const guide = {
      ...doc,
      id: "g1",
      createdAt: "",
      updatedAt: "",
      sceneAnalysis: {
        subject: "Stormi",
        action: "running on a treadmill",
        environment: "home gym cardio corner",
        emotionalGoal: "confidence",
      },
      shots: doc.shots.map((s, i) => ({
        ...s,
        camera: "Sony FX3 Camera Body",
        lens: i === 0 ? "35mm" : "50mm",
        support: "Tripod",
        audioRequirements: "MOS",
        continuityRequirements: "Same shoes, sweat increases",
      })),
    };
    const list = buildChecklistFromGuide(guide);
    const groups = new Set(list.map((i) => i.group));
    for (const g of CHECKLIST_GROUPS) expect(groups.has(g)).toBe(true);
    expect(list.some((i) => /treadmill|gym|sweat/i.test(i.label))).toBe(true);
    expect(list.some((i) => /FX3|35mm|50mm/i.test(i.label))).toBe(true);
    expect(list.some((i) => i.group === "shot" && /Shot 01/.test(i.label))).toBe(true);
  });
});

describe("mergeChecklist", () => {
  it("keeps done flags when labels match after regen", () => {
    const next = buildChecklistFromGuide({
      ...createGuideDocument("u1", { sourceType: "quick_scene", prompt: "A quiet interview." }),
      id: "g",
      createdAt: "",
      updatedAt: "",
    });
    const existing = next.map((i, idx) => ({ ...i, done: idx === 0 }));
    const merged = mergeChecklist(existing, next);
    expect(merged[0].done).toBe(true);
    expect(merged.slice(1).every((i) => !i.done)).toBe(true);
  });
});

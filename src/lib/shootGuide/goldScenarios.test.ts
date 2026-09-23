import { describe, expect, it } from "vitest";
import { coverageHint } from "./generate/context";
import { mockSceneAnalysisJson, mockShotsJson, mockSingleShotJson, mockStrategyJson } from "./generate/mock";
import { SHOT_VARIANT_INSTRUCTIONS } from "./types";

describe("gold-standard shot sequences", () => {
  it("treadmill opens on geography and finishes still", () => {
    const shots = mockShotsJson({
      title: "Stormi treadmill",
      prompt: "Stormi is on the treadmill working out.",
      desiredShotCount: 5,
    }).shots;
    expect(shots).toHaveLength(5);
    expect(shots[0].title.toLowerCase()).toMatch(/establish|machine|geography/);
    expect(shots.some((s) => /effort|stride|body/i.test(`${s.title} ${s.purpose}`))).toBe(true);
    expect(shots[4].movement.toLowerCase()).toMatch(/locked/);
  });

  it("horror kitchen includes a clean plate and matched reveal", () => {
    const shots = mockShotsJson({
      title: "Night kitchen",
      prompt: "A kitchen horror scene. Something is in the dark.",
      desiredShotCount: 5,
    }).shots;
    const text = shots.map((s) => `${s.title} ${s.purpose} ${s.movement}`).join(" ");
    expect(text.toLowerCase()).toMatch(/clean plate/);
    expect(text.toLowerCase()).toMatch(/matched reveal/);
    expect(text.toLowerCase()).toMatch(/uneasy/);
    expect(text.toLowerCase()).toMatch(/controlled/);
  });

  it("interview protects eyeline and stays locked", () => {
    const shots = mockShotsJson({
      title: "Founder interview",
      prompt: "Interview setup with one subject talking.",
      desiredShotCount: 5,
    }).shots;
    expect(shots.every((s) => /locked/i.test(s.movement))).toBe(true);
    expect(shots.some((s) => /eyeline/i.test(`${s.title} ${s.purpose} ${s.cameraAngle} ${s.reason}`))).toBe(
      true
    );
  });

  it("product ends on a packshot", () => {
    const shots = mockShotsJson({
      title: "Bottle hero",
      prompt: "Product commercial for a bottle. Packshot finish.",
      desiredShotCount: 5,
    }).shots;
    expect(shots[4].title.toLowerCase()).toMatch(/packshot/);
    expect(shots.some((s) => /texture|material|detail/i.test(`${s.title} ${s.purpose}`))).toBe(true);
  });
});

describe("shot variants", () => {
  it("use less gear and more cinematic rewrite the mock card", () => {
    const less = mockSingleShotJson(
      { title: "Stormi treadmill", prompt: "Stormi is on the treadmill working out.", desiredShotCount: 5 },
      1,
      SHOT_VARIANT_INSTRUCTIONS.less_gear
    ).shot;
    expect(less.support).toMatch(/tripod/i);
    expect(less.lightingChanges.toLowerCase()).toMatch(/one key/);
    const cine = mockSingleShotJson(
      { title: "Stormi treadmill", prompt: "Stormi is on the treadmill working out.", desiredShotCount: 5 },
      1,
      SHOT_VARIANT_INSTRUCTIONS.more_cinematic
    ).shot;
    expect(cine.reason.toLowerCase()).toMatch(/cinematic/);
  });
});

describe("coverageHint", () => {
  it("tags horror, interview, product, and treadmill", () => {
    expect(coverageHint({ prompt: "kitchen horror", title: "x", creativeIntent: "horror" })).toMatch(
      /clean plate/
    );
    expect(coverageHint({ prompt: "interview", title: "Talk", creativeIntent: "documentary" })).toMatch(
      /eyeline/
    );
    expect(coverageHint({ prompt: "product packshot", title: "Ad", creativeIntent: "commercial" })).toMatch(
      /packshot/
    );
    expect(coverageHint({ prompt: "treadmill workout", title: "Stormi", creativeIntent: "cinematic" })).toMatch(
      /effort/
    );
  });
});

describe("gold scene analysis", () => {
  it("names the kitchen and the product", () => {
    expect(mockSceneAnalysisJson({ prompt: "horror kitchen at night", title: "Kitchen", creativeIntent: "horror" }).environment.toLowerCase()).toMatch(
      /kitchen/
    );
    expect(mockSceneAnalysisJson({ prompt: "product commercial", title: "Bottle", creativeIntent: "commercial" }).subject.toLowerCase()).toMatch(
      /product/
    );
    expect(mockStrategyJson({ prompt: "interview", title: "Talk", creativeIntent: "documentary", desiredShotCount: 5, useMyEquipment: true }).overview.visualStrategy.toLowerCase()).toMatch(
      /eyeline|mcu|listen/
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  STORYBOARD_IMAGE_COST_USD,
  buildStoryboardFramePrompt,
  storyboardAspectRatio,
} from "@/lib/scriptWriter/storyboardImage";
import type { ScriptDocument, ScriptStoryboardFrame } from "@/lib/scriptWriter/types";

function makeScript(overrides: Partial<ScriptDocument> = {}): ScriptDocument {
  return {
    title: "Night Drive",
    logline: "A courier races the dawn to deliver a stranger's last letter.",
    lookAndFeel: "Neon-soaked, rain-slick streets; anamorphic flares.",
    genre: "Neo-noir",
    fountain: "",
    scenes: [],
    characters: [],
    suggestedShots: [],
    ...overrides,
  };
}

function makeFrame(overrides: Partial<ScriptStoryboardFrame> = {}): ScriptStoryboardFrame {
  return {
    sceneNumber: "1",
    sceneHeading: "INT. CAR - NIGHT",
    shotType: "close_up",
    caption: "Her eyes catch the passing streetlights.",
    ...overrides,
  };
}

describe("buildStoryboardFramePrompt", () => {
  it("asks for a single photoreal cinematic still", () => {
    const prompt = buildStoryboardFramePrompt(makeFrame(), makeScript());
    expect(prompt).toContain("photorealistic cinematic film still");
    expect(prompt).toContain("Single image only");
  });

  it("grounds the prompt in the frame caption and script context", () => {
    const prompt = buildStoryboardFramePrompt(makeFrame(), makeScript());
    expect(prompt).toContain("Her eyes catch the passing streetlights.");
    expect(prompt).toContain("Neo-noir");
    expect(prompt).toContain("Neon-soaked");
    expect(prompt).toContain("A courier races the dawn");
  });

  it("omits missing optional context lines", () => {
    const prompt = buildStoryboardFramePrompt(
      makeFrame({ sceneHeading: undefined }),
      makeScript({ lookAndFeel: undefined, genre: undefined })
    );
    expect(prompt).not.toContain("Look & feel:");
    expect(prompt).not.toContain("Genre:");
    expect(prompt).not.toContain("Scene:");
  });
});

describe("storyboardAspectRatio", () => {
  it("defaults to 16:9", () => {
    expect(storyboardAspectRatio(makeFrame({ shotType: "wide" }))).toBe("16:9");
  });

  it("switches to 9:16 for vertical / social / reel shots", () => {
    expect(storyboardAspectRatio(makeFrame({ shotType: "vertical_social" }))).toBe("9:16");
    expect(storyboardAspectRatio(makeFrame({ shotType: "reel_cutaway" }))).toBe("9:16");
  });
});

describe("STORYBOARD_IMAGE_COST_USD", () => {
  it("is a small positive per-image estimate", () => {
    expect(STORYBOARD_IMAGE_COST_USD).toBeGreaterThan(0);
    expect(STORYBOARD_IMAGE_COST_USD).toBeLessThan(1);
  });
});

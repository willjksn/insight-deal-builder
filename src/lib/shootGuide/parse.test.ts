import { describe, expect, it } from "vitest";
import { emptyShot } from "./defaults";
import { mockSceneAnalysisJson, mockShotsJson, mockStrategyJson } from "./generate/mock";
import {
  mergeGeneratedShots,
  parseGeneratedShots,
  parseSceneAnalysis,
  parseStrategy,
  replaceGeneratedShot,
} from "./parse";

const TREADMILL = {
  title: "Stormi treadmill",
  prompt: "Stormi is on the treadmill working out. I want a cinematic workout sequence that shows effort and confidence.",
  creativeIntent: "cinematic",
  desiredShotCount: 5,
  useMyEquipment: true,
  sourceSceneLabel: null as string | null,
};

describe("parseSceneAnalysis", () => {
  it("reads subject/action/emotion from treadmill mock JSON", () => {
    const analysis = parseSceneAnalysis(mockSceneAnalysisJson(TREADMILL));
    expect(analysis.subject?.toLowerCase()).toMatch(/stormi/);
    expect(analysis.action?.toLowerCase()).toMatch(/treadmill|run|walk/);
    expect(analysis.emotionalGoal?.toLowerCase()).toMatch(/confidence|effort/);
  });
});

describe("parseStrategy", () => {
  it("fills overview + lighting from mock strategy", () => {
    const strategy = parseStrategy(mockStrategyJson(TREADMILL), 5);
    expect(strategy.overview.visualStrategy.toLowerCase()).toMatch(/wide|hero|locked/);
    expect(strategy.overview.recommendedShotCount).toBe(5);
    expect(strategy.setup.lightingNotes.length).toBeGreaterThan(20);
    expect(strategy.lightingPlan.fixtures.length).toBeGreaterThan(0);
  });
});

describe("parseGeneratedShots", () => {
  it("returns five purposeful treadmill shots with DP fields", () => {
    const shots = parseGeneratedShots(mockShotsJson(TREADMILL));
    expect(shots).toHaveLength(5);
    expect(shots[0].title.toLowerCase()).toMatch(/establish/);
    expect(shots[4].title.toLowerCase()).toMatch(/hero|finish/);
    expect(shots.every((s) => s.purpose.length > 20)).toBe(true);
    expect(shots.every((s) => s.lens && s.camera && s.reason)).toBe(true);
  });
});

describe("mergeGeneratedShots", () => {
  it("keeps existing ids and take records", () => {
    const existing = [emptyShot(1), emptyShot(2)];
    existing[0].takeRecords = [{ id: "t1", takeNumber: 1, status: "GOOD" }];
    existing[0].status = "complete";
    const generated = parseGeneratedShots(mockShotsJson({ ...TREADMILL, desiredShotCount: 2 }));
    const merged = mergeGeneratedShots(existing, generated);
    expect(merged[0].id).toBe(existing[0].id);
    expect(merged[0].takeRecords[0].id).toBe("t1");
    expect(merged[0].status).toBe("complete");
    expect(merged[0].title).toBe(generated[0].title);
  });
});

describe("replaceGeneratedShot", () => {
  it("swaps one card without dropping neighbors", () => {
    const existing = parseGeneratedShots(mockShotsJson(TREADMILL));
    const next = { ...existing[1], title: "Low stride", lens: "85mm prime" };
    const replaced = replaceGeneratedShot(existing, existing[1].id, next);
    expect(replaced).toHaveLength(5);
    expect(replaced[1].title).toBe("Low stride");
    expect(replaced[1].id).toBe(existing[1].id);
    expect(replaced[0].title).toBe(existing[0].title);
  });
});

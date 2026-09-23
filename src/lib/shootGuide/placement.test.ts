import { describe, expect, it } from "vitest";
import { parseVisualIntelligence } from "./generate/vision";
import { mockVisualIntelligenceJson } from "./generate/mock";
import { parseLocationAnalysis, parsePlacementPlan } from "./parse";
import { needsVisualIntelligence, placementPlanIsThin } from "./placement";
import { pickWidestStill } from "./widestStill";

const TREADMILL = {
  title: "Stormi treadmill",
  prompt: "Stormi is on the treadmill working out.",
  references: [
    {
      id: "loc1",
      kind: "location" as const,
      storageUrl: "https://example.com/gym.jpg",
      storagePath: "shoot-guide/u/g/location/a.jpg",
      fileName: "gym.jpg",
    },
  ],
};

describe("parseVisualIntelligence", () => {
  it("reads location analysis from treadmill mock", () => {
    const parsed = parseVisualIntelligence(mockVisualIntelligenceJson(TREADMILL));
    expect(parsed.locationAnalysis.layout?.toLowerCase()).toMatch(/treadmill/);
    expect(parsed.locationAnalysis.clutter?.toLowerCase()).toMatch(/clutter|bottle|logo/);
  });
});

describe("pickWidestStill", () => {
  it("picks the widest location or mood still", () => {
    const picked = pickWidestStill(
      [
        { id: "tight", kind: "location" },
        { id: "wide", kind: "location" },
        { id: "mood", kind: "mood" },
      ],
      {
        tight: { width: 800, height: 600 },
        wide: { width: 1920, height: 1080 },
        mood: { width: 4000, height: 2000 },
      }
    );
    expect(picked?.id).toBe("mood");
  });

  it("skips storyboard grids when asking for a single frame", () => {
    const picked = pickWidestStill(
      [
        { id: "board", kind: "mood", fileName: "Cinematic Treadmill Workout Storyboard.png" },
        { id: "room", kind: "location", fileName: "gym.jpg" },
      ],
      {
        board: { width: 4000, height: 3000 },
        room: { width: 1920, height: 1080 },
      },
      { singleFrameOnly: true }
    );
    expect(picked?.id).toBe("room");
  });
});

describe("needsVisualIntelligence", () => {
  it("is true when stills exist and location analysis is missing", () => {
    expect(
      needsVisualIntelligence({
        references: TREADMILL.references,
        locationAnalysis: null,
        placementPlan: null,
      } as never)
    ).toBe(true);
    expect(placementPlanIsThin(null)).toBe(true);
  });

  it("is false when there are no stills", () => {
    expect(
      needsVisualIntelligence({
        references: [],
        locationAnalysis: null,
        placementPlan: null,
      } as never)
    ).toBe(false);
  });
});

describe("parseLocationAnalysis", () => {
  it("keeps optional clutter and geometry and clamps coords", () => {
    const a = parseLocationAnalysis({
      layout: "Gym bay",
      clutter: "Hide bottles",
      geometry: "Rectangle",
    });
    expect(a.clutter).toBe("Hide bottles");
    const plan = parsePlacementPlan({
      topDown: { markers: [{ kind: "subject", x: 1.4, y: -0.2, label: "S" }] },
    });
    expect(plan.topDown?.markers[0].x).toBe(1);
    expect(plan.topDown?.markers[0].y).toBe(0);
  });
});

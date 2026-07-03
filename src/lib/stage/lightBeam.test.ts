import { describe, expect, it } from "vitest";
import { lightBeamPolygon, resolveLightBeam, resolveWindowSpill, windowSpillPolygon } from "@/lib/stage/lightBeam";
import { StagePropElement } from "@/lib/stage/types";

describe("lightBeamPolygon", () => {
  it("builds a downward cone from apex", () => {
    const points = lightBeamPolygon(80, 40, 120);
    expect(points).toContain("40,0");
    expect(points).toContain("120");
  });
});

describe("resolveWindowSpill", () => {
  it("returns daylight spill by default", () => {
    const spill = resolveWindowSpill({
      id: "w1",
      kind: "window",
      x: 0,
      y: 0,
      width: 80,
      height: 12,
    });
    expect(spill?.enabled).toBe(true);
    expect(spill?.spread).toBe(56);
  });
});

describe("windowSpillPolygon", () => {
  it("builds trapezoid below window", () => {
    const points = windowSpillPolygon(80, 12, 60, 56);
    expect(points).toContain("12");
    expect(points).toContain("72");
  });
});

describe("resolveLightBeam", () => {
  it("enables beam for lighting props by default", () => {
    const el: StagePropElement = {
      id: "1",
      kind: "prop",
      propId: "fresnel",
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
    };
    const beam = resolveLightBeam(el);
    expect(beam?.enabled).toBe(true);
    expect(beam?.spread).toBeLessThan(30);
  });
});

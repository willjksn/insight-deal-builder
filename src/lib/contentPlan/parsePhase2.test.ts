import { describe, expect, it } from "vitest";
import {
  parseColorPlan,
  parseEditPlan,
  parseLightingPlan,
  parseMusicPlan,
  parseSoundPlan,
} from "@/lib/contentPlan/parsePhase2";

describe("contentPlan phase2 parse", () => {
  it("parses edit plan map + instructions", () => {
    const plan = parseEditPlan({
      philosophy: "Cut on action",
      map: [
        {
          startTime: "0:00",
          endTime: "0:03",
          shotId: "shot_01",
          shotLabel: "Approach",
          transitionToNext: "Cut on Action",
        },
      ],
      instructions: [
        {
          fromShotId: "shot_01",
          toShotId: "shot_02",
          approximateTimelinePosition: "0:03",
          editType: "Cut on Action",
          cutTrigger: "Fingers hit handle",
          why: "Hides the cut",
        },
      ],
    });
    expect(plan.map).toHaveLength(1);
    expect(plan.instructions[0]?.editType).toBe("Cut on Action");
  });

  it("parses sound/music/look/lighting", () => {
    expect(parseSoundPlan({ overview: "Clean", foley: [{ soundName: "Can crack" }] }).foley).toHaveLength(1);
    expect(parseMusicPlan({ style: "Luxury beat", bpm: "95" }).style).toBe("Luxury beat");
    expect(parseColorPlan({ lookName: "Warm natural" }).lookName).toBe("Warm natural");
    expect(parseLightingPlan({ key: "Soft 45°", motivatedSource: "Window" }).key).toContain("Soft");
  });
});

import { describe, expect, it } from "vitest";
import {
  formatContentPlanGearPrompt,
  hydrateInputsFromKit,
  kitFromContentPlanInputs,
  mergeShootingKits,
  splitGearList,
} from "@/lib/contentPlan/resolveAvailableGear";
import { defaultContentPlanInputs } from "@/lib/contentPlan/types";

describe("resolveAvailableGear", () => {
  it("splits gear lists", () => {
    expect(splitGearList("FX3,  FX6; A7SIII\nBMPCC")).toEqual([
      "FX3",
      "FX6",
      "A7SIII",
      "BMPCC",
    ]);
  });

  it("builds kit from inputs", () => {
    const kit = kitFromContentPlanInputs(
      defaultContentPlanInputs({
        camerasAvailable: "Sony FX3",
        lensesAvailable: "35mm, 50mm",
        lightingAvailable: "Aputure 300d",
        equipmentAvailable: "Tripod",
      })
    );
    expect(kit.cameraBodies).toEqual(["Sony FX3"]);
    expect(kit.lenses).toEqual(["35mm", "50mm"]);
    expect(kit.lights).toEqual(["Aputure 300d"]);
    expect(kit.other).toEqual(["Tripod"]);
  });

  it("prefers structured shootingKit over legacy strings", () => {
    const kit = kitFromContentPlanInputs(
      defaultContentPlanInputs({
        camerasAvailable: "Ignored",
        shootingKit: {
          cameraBodies: ["FX3"],
          lenses: ["35mm"],
          supports: ["Tripod"],
          lights: [],
          grip: [],
          audio: ["Lav"],
          props: [],
          other: [],
        },
      })
    );
    expect(kit.cameraBodies).toEqual(["FX3"]);
    expect(kit.supports).toEqual(["Tripod"]);
    expect(kit.audio).toEqual(["Lav"]);
  });

  it("merges kits without dupes", () => {
    const merged = mergeShootingKits(
      { cameraBodies: ["FX3"], lenses: ["35mm"], supports: [], lights: [], grip: [], audio: [], props: [], other: [] },
      { cameraBodies: ["fx3", "FX6"], lenses: ["50mm"], supports: ["Tripod"], lights: [], grip: [], audio: [], props: [], other: [] }
    );
    expect(merged.cameraBodies).toEqual(["FX3", "FX6"]);
    expect(merged.lenses).toEqual(["35mm", "50mm"]);
    expect(merged.supports).toEqual(["Tripod"]);
  });

  it("hydrates empty input fields from kit", () => {
    const next = hydrateInputsFromKit(
      defaultContentPlanInputs({ idea: "x" }),
      {
        cameraBodies: ["FX3"],
        lenses: ["35mm"],
        supports: [],
        lights: ["300d"],
        grip: [],
        audio: [],
        props: [],
        other: [],
      }
    );
    expect(next.camerasAvailable).toBe("FX3");
    expect(next.lensesAvailable).toBe("35mm");
    expect(next.lightingAvailable).toBe("300d");
  });

  it("formats strict gear prompt when constrained", () => {
    const block = formatContentPlanGearPrompt(
      {
        cameraBodies: ["FX3"],
        lenses: ["35mm"],
        supports: [],
        lights: [],
        grip: [],
        audio: [],
        props: [],
        other: [],
      },
      true
    );
    expect(block).toContain("AVAILABLE SHOOTING KIT");
    expect(block).toContain("FX3");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildAutoSplitPlan,
  groupShotsByLocation,
  moveShotBetweenDays,
  sceneLocationMap,
} from "@/lib/production/splitShotsAcrossDays";
import { ProductionBoard, ProductionDayShot } from "@/lib/production/types";
import { ScriptDocument } from "@/lib/scriptWriter/types";

function shot(num: number, scene: string, locationHint?: string): ProductionDayShot {
  return {
    id: `s${num}`,
    label: `${num}. Shot`,
    scoutShotNumber: num,
    sceneRef: scene,
    done: false,
    sortOrder: num,
    shotName: locationHint,
  };
}

describe("groupShotsByLocation", () => {
  const script: ScriptDocument = {
    title: "T",
    logline: "L",
    fountain: "",
    scenes: [
      { sceneNumber: "1", heading: "EXT. STREET - NIGHT", action: "", dialogue: [] },
      { sceneNumber: "2", heading: "INT. KITCHEN - NIGHT", action: "", dialogue: [] },
    ],
    characters: [],
    suggestedShots: [],
  };

  it("groups by scene location", () => {
    const groups = groupShotsByLocation(
      [shot(1, "1"), shot(2, "1"), shot(3, "2")],
      sceneLocationMap(script)
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].location).toBe("STREET");
    expect(groups[0].shots).toHaveLength(2);
    expect(groups[1].location).toBe("KITCHEN");
  });
});

describe("buildAutoSplitPlan", () => {
  it("suggests multiple days for large lists", () => {
    const shots = Array.from({ length: 30 }, (_, i) => shot(i + 1, String((i % 3) + 1)));
    const plan = buildAutoSplitPlan({ shots });
    expect(plan.suggestedDays).toBeGreaterThan(1);
    expect(plan.dayShots.flat()).toHaveLength(30);
  });
});

describe("moveShotBetweenDays", () => {
  const board: ProductionBoard = {
    id: "b1",
    projectId: "p1",
    userId: "u1",
    people: [],
    storyLinks: [],
    inspirationImages: [],
    locations: [],
    gearItems: [],
    linkedScoutProjectIds: [],
    productionDays: [
      {
        id: "d1",
        title: "Day 1",
        dayNumber: 1,
        scenes: [],
        schedule: [],
        shots: [shot(1, "1")],
      },
      {
        id: "d2",
        title: "Day 2",
        dayNumber: 2,
        scenes: [],
        schedule: [],
        shots: [],
      },
    ],
  } as ProductionBoard;

  it("moves a shot between days", () => {
    const next = moveShotBetweenDays(board, "s1", "d1", "d2");
    expect(next).not.toBeNull();
    expect(next!.find((d) => d.id === "d1")!.shots).toHaveLength(0);
    expect(next!.find((d) => d.id === "d2")!.shots).toHaveLength(1);
  });
});

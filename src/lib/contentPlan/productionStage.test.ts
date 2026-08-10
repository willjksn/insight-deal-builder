import { describe, expect, it } from "vitest";
import {
  allShotsCompleted,
  countCompletedShots,
  normalizeProductionStage,
  productionStageLabel,
} from "@/lib/contentPlan/productionStage";
import type { ContentShot } from "@/lib/contentPlan/types";

function shot(status: ContentShot["status"]): ContentShot {
  return {
    id: status,
    shotNumber: 1,
    shotName: "A",
    storyPurpose: "",
    startTime: "0:00",
    endTime: "0:01",
    estimatedDuration: "1s",
    visualDescription: "",
    shotSize: "MS",
    movement: "Locked",
    howToShoot: { steps: [], commonMistakes: [], continuity: [] },
    status,
  };
}

describe("productionStage", () => {
  it("normalizes unknown values to planning", () => {
    expect(normalizeProductionStage("nope")).toBe("planning");
    expect(normalizeProductionStage("shooting")).toBe("shooting");
  });

  it("labels stages", () => {
    expect(productionStageLabel("ready_to_shoot")).toBe("Ready to shoot");
  });

  it("counts completed shots", () => {
    expect(
      countCompletedShots([shot("completed"), shot("planned"), shot("completed")])
    ).toEqual({ done: 2, total: 3 });
    expect(allShotsCompleted({ shots: [shot("completed"), shot("completed")] })).toBe(
      true
    );
    expect(allShotsCompleted({ shots: [] })).toBe(false);
  });
});

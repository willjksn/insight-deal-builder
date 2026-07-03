import { describe, expect, it } from "vitest";
import { ScoutShotListItem } from "@/lib/scout/types";
import { ProductionDayShot } from "@/lib/production/types";
import {
  productionAndScoutShotListsMatch,
  scoutShotsFromProductionList,
} from "@/lib/production/shotListSync";

describe("shotListSync", () => {
  it("converts production shots to scout format", () => {
    const production: ProductionDayShot[] = [
      {
        id: "a",
        label: "1. Wide / Establishing",
        done: false,
        scoutShotNumber: 1,
        sortOrder: 0,
        shotType: "master_wide",
        shotName: "Wide / Establishing",
        subjectAction: "Stormi enters",
        sceneRef: "1",
      },
    ];
    const scout = scoutShotsFromProductionList(production);
    expect(scout[0].shotName).toBe("Wide / Establishing");
    expect(scout[0].shotType).toBe("master_wide");
    expect(scout[0].subjectAction).toBe("Stormi enters");
  });

  it("detects when lists differ", () => {
    const production: ProductionDayShot[] = [
      {
        id: "a",
        label: "1. Wide",
        done: false,
        scoutShotNumber: 1,
        sortOrder: 0,
        shotName: "Wide",
      },
    ];
    const scout: ScoutShotListItem[] = [
      {
        shotNumber: 1,
        shotName: "AI master wide",
        scene: "1",
        shotType: "master_wide",
        camera: "",
        lens: "",
        frameRate: "24fps",
        cameraMovement: "",
        subjectAction: "",
        blockingNotes: "",
        lightingNotes: "",
        audioDialogueNotes: "",
        priority: "must_have",
        status: "planned",
        notes: "",
      },
    ];
    expect(productionAndScoutShotListsMatch(production, scout)).toBe(false);
  });
});

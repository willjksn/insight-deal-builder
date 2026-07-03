import { describe, expect, it } from "vitest";
import {
  buildLensSelectOptions,
  buildMovementSelectOptions,
  isPresetShotListValue,
  SCOUT_SHOT_FIELD_CUSTOM,
  shotListSelectValue,
  shotListsEqual,
} from "@/lib/scout/shotListFieldOptions";

describe("shotListFieldOptions", () => {
  it("builds lens options from gear plus custom", () => {
    const options = buildLensSelectOptions(["35mm", "50mm"]);
    expect(options.map((o) => o.value)).toEqual(["35mm", "50mm", SCOUT_SHOT_FIELD_CUSTOM]);
  });

  it("builds movement options from creative brief", () => {
    const options = buildMovementSelectOptions({
      cameraMovements: ["dolly_push_in", "dolly_pull_out"],
    });
    expect(options.some((o) => o.label === "Dolly push-in")).toBe(true);
    expect(options.some((o) => o.label === "Dolly pull-out")).toBe(true);
    expect(options.at(-1)?.value).toBe(SCOUT_SHOT_FIELD_CUSTOM);
  });

  it("treats unknown stored values as custom", () => {
    const options = buildLensSelectOptions(["35mm"]);
    expect(shotListSelectValue("85mm macro", options)).toBe(SCOUT_SHOT_FIELD_CUSTOM);
    expect(shotListSelectValue("35mm", options)).toBe("35mm");
    expect(isPresetShotListValue("35mm", options)).toBe(true);
    expect(isPresetShotListValue("85mm macro", options)).toBe(false);
  });

  it("detects equivalent shot lists after trimming empty fields", () => {
    const left = [
      {
        shotNumber: 1,
        scene: "Scene 1",
        shotType: "medium_shot" as const,
        camera: "",
        lens: "35mm",
        frameRate: "24fps",
        cameraMovement: "Handheld",
        subjectAction: "Walks in",
        blockingNotes: "",
        lightingNotes: "",
        audioDialogueNotes: "",
        priority: "must_have" as const,
        status: "planned" as const,
        notes: "",
      },
    ];
    const right = [{ ...left[0], camera: undefined as unknown as string }];
    expect(shotListsEqual(left, right)).toBe(true);
  });
});

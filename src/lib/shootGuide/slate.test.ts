import { describe, expect, it } from "vitest";
import { emptyShot } from "./defaults";
import { inferAudioSync, logTake, nextTakeNumber, slateDefaults } from "./slate";

describe("nextTakeNumber", () => {
  it("starts at 1 and increments past logged takes", () => {
    const shot = emptyShot(2);
    expect(nextTakeNumber(shot)).toBe(1);
    shot.takeRecords = [logTake({ shot, takeNumber: 1, status: "NG" })];
    expect(nextTakeNumber(shot)).toBe(2);
  });
});

describe("slateDefaults", () => {
  it("fills scene/shot/take from the current card", () => {
    const shot = emptyShot(4);
    shot.camera = "Sony FX3";
    shot.audioRequirements = "MOS";
    const slate = slateDefaults(
      {
        sourceSceneLabel: "2A. INT GYM",
        setup: { cameraSettings: "24p · 1/48", locationNotes: "", lightingNotes: "", equipmentList: "", cameraPlacement: "" },
      } as never,
      shot
    );
    expect(slate.scene).toMatch(/2A/);
    expect(slate.shot).toBe("04");
    expect(slate.take).toBe(1);
    expect(inferAudioSync(shot)).toBe("mos");
  });
});

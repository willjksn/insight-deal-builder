import { describe, expect, it } from "vitest";
import {
  formatCameraMovementLabels,
  readCameraMovementsFromBrief,
  toggleCameraMovement,
  withCameraMovements,
} from "@/lib/scout/cameraMovementBrief";

describe("cameraMovementBrief", () => {
  it("reads legacy single value", () => {
    expect(readCameraMovementsFromBrief({ cameraMovement: "gimbal_push" })).toEqual(["gimbal_push"]);
  });

  it("reads stored array", () => {
    expect(
      readCameraMovementsFromBrief({
        cameraMovements: ["dolly_push_in", "dolly_pull_out"],
      })
    ).toEqual(["dolly_push_in", "dolly_pull_out"]);
  });

  it("toggles selections", () => {
    expect(toggleCameraMovement(["handheld"], "dolly_push_in")).toEqual(["handheld", "dolly_push_in"]);
    expect(toggleCameraMovement(["handheld", "dolly_push_in"], "handheld")).toEqual(["dolly_push_in"]);
  });

  it("writes human-readable summary", () => {
    const brief = withCameraMovements({}, ["dolly_push_in", "gimbal_push"]);
    expect(brief.cameraMovements).toEqual(["dolly_push_in", "gimbal_push"]);
    expect(brief.cameraMovement).toBe(formatCameraMovementLabels(["dolly_push_in", "gimbal_push"]));
  });
});

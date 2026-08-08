import { describe, expect, it } from "vitest";
import { buildManagedFolderPlan } from "@/lib/aiEditor/projectFolders";

describe("aiEditor projectFolders", () => {
  it("includes base layout and camera folders", () => {
    const plan = buildManagedFolderPlan(["Camera A", "Camera B"]);
    expect(plan).toContain("01_ORIGINAL_MEDIA");
    expect(plan).toContain("06_EXPORTS");
    expect(plan).toContain("01_ORIGINAL_MEDIA/CAMERA_A");
    expect(plan).toContain("01_ORIGINAL_MEDIA/CAMERA_B");
    expect(plan).toContain("01_ORIGINAL_MEDIA/AUDIO");
  });

  it("defaults to CAMERA_A", () => {
    expect(buildManagedFolderPlan()).toContain("01_ORIGINAL_MEDIA/CAMERA_A");
  });
});

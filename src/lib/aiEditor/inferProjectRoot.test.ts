import { describe, expect, it } from "vitest";
import {
  alignManagedRootWithProjectName,
  inferManagedProjectRootFromMedia,
  preferLiveProjectRoot,
  projectRootFromManagedMediaPath,
  resolveLiveProjectRoot,
} from "@/lib/aiEditor/inferProjectRoot";

describe("inferProjectRoot", () => {
  it("extracts managed root from a clip path", () => {
    expect(
      projectRootFromManagedMediaPath(
        "H:\\Media\\Monopoly_Night\\01_ORIGINAL_MEDIA\\CAMERA_A\\a.mp4"
      )
    ).toBe("H:\\Media\\Monopoly_Night");
  });

  it("still extracts legacy Media\\ShootSpine roots", () => {
    expect(
      projectRootFromManagedMediaPath(
        "H:\\Media\\ShootSpine\\Monopoly_Night\\01_ORIGINAL_MEDIA\\CAMERA_A\\a.mp4"
      )
    ).toBe("H:\\Media\\ShootSpine\\Monopoly_Night");
  });

  it("infers the majority media root", () => {
    expect(
      inferManagedProjectRootFromMedia([
        {
          currentPath: "H:\\Media\\Monopoly_Night\\01_ORIGINAL_MEDIA\\a.mp4",
        },
        {
          currentPath: "H:\\Media\\Monopoly_Night\\01_ORIGINAL_MEDIA\\b.mp4",
        },
      ])
    ).toBe("H:\\Media\\Monopoly_Night");
  });

  it("prefers media SSD root over stale smoke settings", () => {
    expect(
      preferLiveProjectRoot({
        settingsRoot: "C:\\Users\\Owner\\Videos\\ShootSpineSmoke",
        mediaRoot: "H:\\Media\\Monopoly_Night",
      })
    ).toBe("H:\\Media\\Monopoly_Night");
  });

  it("renames managed leaf to match project name", () => {
    expect(
      alignManagedRootWithProjectName({
        projectRoot: "H:\\Media\\Untitled_footage_edit",
        projectName: "Monopoly Night",
      })
    ).toBe("H:\\Media\\Monopoly_Night");
  });

  it("resolves live root from stale Untitled paths + project name", () => {
    expect(
      resolveLiveProjectRoot({
        settingsRoot: "H:\\Media\\Untitled_footage_edit",
        mediaRoot: "H:\\Media\\Untitled_footage_edit",
        projectName: "Monopoly Night",
      })
    ).toBe("H:\\Media\\Monopoly_Night");
  });
});

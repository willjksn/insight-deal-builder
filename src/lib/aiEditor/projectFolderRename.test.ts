import { describe, expect, it } from "vitest";
import { planManagedProjectFolderRename } from "@/lib/aiEditor/projectFolderRename";

describe("planManagedProjectFolderRename", () => {
  it("renames managed Media leaf to new project slug", () => {
    const plan = planManagedProjectFolderRename({
      currentProjectRoot: "H:\\Media\\Untitled_footage_edit",
      newProjectName: "Monopoly Night",
    });
    expect(plan).toEqual({
      action: "rename",
      from: "H:\\Media\\Untitled_footage_edit",
      to: "H:\\Media\\Monopoly_Night",
      managed: true,
    });
  });

  it("still renames legacy Media/ShootSpine leaves", () => {
    const plan = planManagedProjectFolderRename({
      currentProjectRoot: "H:\\Media\\ShootSpine\\Untitled_footage_edit",
      newProjectName: "Monopoly Night",
    });
    expect(plan).toEqual({
      action: "rename",
      from: "H:\\Media\\ShootSpine\\Untitled_footage_edit",
      to: "H:\\Media\\ShootSpine\\Monopoly_Night",
      managed: true,
    });
  });

  it("renames ShootSpineSmoke-style folders on the same parent", () => {
    const plan = planManagedProjectFolderRename({
      currentProjectRoot: "C:\\Users\\Owner\\Videos\\ShootSpineSmoke",
      newProjectName: "Monopoly Night",
    });
    expect(plan.action).toBe("rename");
    if (plan.action === "rename") {
      expect(plan.to).toBe("C:\\Users\\Owner\\Videos\\Monopoly_Night");
    }
  });

  it("skips when slug already matches", () => {
    const plan = planManagedProjectFolderRename({
      currentProjectRoot: "H:\\Media\\Monopoly_Night",
      newProjectName: "Monopoly Night",
    });
    expect(plan).toEqual({ action: "none", reason: "same_path" });
  });

  it("is name-only for unrelated custom roots", () => {
    const plan = planManagedProjectFolderRename({
      currentProjectRoot: "D:\\ClientJobs\\Wedding_2024",
      newProjectName: "Monopoly Night",
    });
    expect(plan).toEqual({
      action: "name_only",
      reason: "not_safe",
      from: "D:\\ClientJobs\\Wedding_2024",
    });
  });
});

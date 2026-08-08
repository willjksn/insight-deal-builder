import { describe, expect, it } from "vitest";
import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import { assessStorageHealth } from "@/lib/aiEditor/storageHealth";

function drive(
  letter: string,
  storageType: AgentDriveEntry["storageType"],
  freeGb = 200
): AgentDriveEntry {
  return {
    path: `${letter}:\\`,
    label: `${letter}:`,
    kind: "drive",
    storageType,
    availableBytes: freeGb * 1024 ** 3,
    capacityBytes: 1000 * 1024 ** 3,
  };
}

describe("assessStorageHealth", () => {
  it("returns null without an edit folder", () => {
    expect(assessStorageHealth({})).toBeNull();
  });

  it("rates dual-drive SSD + HDD as good", () => {
    const summary = assessStorageHealth({
      projectRootPath: "E:\\Shoots\\Show",
      archiveRootPath: "F:\\Backup",
      drives: [drive("E", "externalSSD"), drive("F", "externalHDD")],
    });
    expect(summary?.level).toBe("good");
    expect(summary?.items.some((i) => i.id === "edit-ssd")).toBe(true);
    expect(summary?.items.some((i) => i.id === "backup-hdd")).toBe(true);
  });

  it("warns when edit is on internal C:", () => {
    const summary = assessStorageHealth({
      projectRootPath: "C:\\Users\\me\\Videos\\Show",
      drives: [drive("C", "internal")],
    });
    expect(summary?.level).toBe("warn");
    expect(summary?.items.some((i) => i.id === "edit-internal")).toBe(true);
    expect(summary?.items.some((i) => i.id === "backup-missing")).toBe(true);
  });

  it("flags edit and backup on the same drive as risk", () => {
    const summary = assessStorageHealth({
      projectRootPath: "E:\\Shoots\\Show",
      archiveRootPath: "E:\\Backup",
      drives: [drive("E", "externalSSD")],
    });
    expect(summary?.level).toBe("risk");
    expect(summary?.items.some((i) => i.id === "same-drive")).toBe(true);
  });

  it("warns on low free space for edit drive", () => {
    const summary = assessStorageHealth({
      projectRootPath: "E:\\Shoots\\Show",
      archiveRootPath: "F:\\Backup",
      drives: [drive("E", "externalSSD", 12), drive("F", "externalHDD", 800)],
    });
    expect(summary?.items.some((i) => i.id === "edit-low-space")).toBe(true);
    expect(summary?.level).toBe("warn");
  });
});

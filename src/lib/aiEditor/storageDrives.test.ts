import { describe, expect, it } from "vitest";
import {
  driveForPath,
  friendlyDriveLabel,
  inferStorageType,
  sortDrivesForPurpose,
} from "@/lib/aiEditor/storageDrives";
import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";

function drive(partial: Partial<AgentDriveEntry> & { path: string }): AgentDriveEntry {
  return {
    label: partial.label || partial.path,
    kind: partial.kind || "drive",
    ...partial,
  };
}

describe("storageDrives", () => {
  it("classifies USB SSD / HDD", () => {
    expect(
      inferStorageType(
        drive({
          path: "E:\\",
          busType: "USB",
          mediaType: "SSD",
          removable: true,
        })
      )
    ).toBe("externalSSD");
    expect(
      inferStorageType(
        drive({
          path: "F:\\",
          busType: "USB",
          mediaType: "HDD",
          capacityBytes: 4 * 1024 ** 4,
        })
      )
    ).toBe("externalHDD");
  });

  it("treats C: as internal", () => {
    expect(
      inferStorageType(drive({ path: "C:\\", mediaType: "SSD", busType: "NVMe" }))
    ).toBe("internal");
  });

  it("formats friendly labels with free space", () => {
    const label = friendlyDriveLabel(
      drive({
        path: "E:\\",
        volumeLabel: "EditSSD",
        busType: "USB",
        mediaType: "SSD",
        availableBytes: 420 * 1024 ** 3,
      })
    );
    expect(label).toMatch(/EditSSD/);
    expect(label).toMatch(/External SSD/);
    expect(label).toMatch(/free/);
  });

  it("matches paths to drive roots", () => {
    const drives = [
      drive({ path: "E:\\", busType: "USB", mediaType: "SSD" }),
      drive({ path: "F:\\", busType: "USB", mediaType: "HDD" }),
    ];
    expect(driveForPath("E:\\Shoots\\Show", drives)?.path).toBe("E:\\");
    expect(inferStorageType(driveForPath("F:\\Backup", drives))).toBe("externalHDD");
  });

  it("sorts edit vs archive preferences", () => {
    const drives = [
      drive({ path: "C:\\", mediaType: "SSD", busType: "NVMe" }),
      drive({ path: "F:\\", busType: "USB", mediaType: "HDD" }),
      drive({ path: "E:\\", busType: "USB", mediaType: "SSD" }),
    ];
    expect(sortDrivesForPurpose(drives, "edit")[0].path).toBe("E:\\");
    expect(sortDrivesForPurpose(drives, "archive")[0].path).toBe("F:\\");
  });
});

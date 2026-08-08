import { describe, expect, it } from "vitest";
import type { DrivePresenceSummary } from "@/lib/aiEditor/drivePresence";
import { driveActionGates } from "@/lib/aiEditor/driveActionGates";

function presence(
  partial: Partial<DrivePresenceSummary> &
    Pick<DrivePresenceSummary, "items">
): DrivePresenceSummary {
  return {
    editBlocked: partial.editBlocked ?? false,
    needsAttention: partial.needsAttention ?? false,
    ...partial,
  };
}

describe("driveActionGates", () => {
  it("allows disk ops when everything is online", () => {
    const g = driveActionGates(
      presence({
        items: [
          { kind: "edit", status: "online", path: "E:\\A", message: "" },
          { kind: "archive", status: "online", path: "F:\\B", message: "" },
        ],
      })
    );
    expect(g.editDiskReady).toBe(true);
    expect(g.archiveDiskReady).toBe(true);
    expect(g.editBlockReason).toBeNull();
  });

  it("blocks edit ops when edit drive is offline", () => {
    const g = driveActionGates(
      presence({
        editBlocked: true,
        needsAttention: true,
        items: [{ kind: "edit", status: "offline", path: "E:\\A", message: "" }],
      })
    );
    expect(g.editDiskReady).toBe(false);
    expect(g.editBlockReason).toMatch(/offline/i);
  });

  it("blocks edit ops when remount is required", () => {
    const g = driveActionGates(
      presence({
        editBlocked: true,
        needsAttention: true,
        items: [{ kind: "edit", status: "remount", path: "E:\\A", message: "" }],
      })
    );
    expect(g.editDiskReady).toBe(false);
    expect(g.editBlockReason).toMatch(/Relink/i);
  });

  it("blocks archive ops when backup is offline but edit stays ready", () => {
    const g = driveActionGates(
      presence({
        needsAttention: true,
        items: [
          { kind: "edit", status: "online", path: "E:\\A", message: "" },
          { kind: "archive", status: "offline", path: "F:\\B", message: "" },
        ],
      })
    );
    expect(g.editDiskReady).toBe(true);
    expect(g.archiveDiskReady).toBe(false);
    expect(g.archiveBlockReason).toMatch(/Backup drive is offline/i);
  });
});

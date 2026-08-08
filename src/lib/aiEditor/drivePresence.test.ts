import { describe, expect, it } from "vitest";
import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import { assessDrivePresence } from "@/lib/aiEditor/drivePresence";

function drive(
  letter: string,
  serial?: string,
  storageType: AgentDriveEntry["storageType"] = "externalSSD"
): AgentDriveEntry {
  return {
    path: `${letter}:\\`,
    label: `${letter}:`,
    kind: "drive",
    volumeIdentifier: serial,
    storageType,
  };
}

describe("assessDrivePresence", () => {
  it("marks edit online when letter is mounted", () => {
    const summary = assessDrivePresence({
      projectRootPath: "E:\\Shoots\\Show",
      projectRootVolumeId: "SERIAL-E",
      drives: [drive("E", "SERIAL-E")],
    });
    expect(summary.items[0]?.status).toBe("online");
    expect(summary.editBlocked).toBe(false);
  });

  it("marks edit offline when drive is missing", () => {
    const summary = assessDrivePresence({
      projectRootPath: "E:\\Shoots\\Show",
      projectRootVolumeId: "SERIAL-E",
      drives: [drive("C", undefined, "internal")],
    });
    expect(summary.items[0]?.status).toBe("offline");
    expect(summary.editBlocked).toBe(true);
    expect(summary.needsAttention).toBe(true);
  });

  it("prefers remount when volume appears under a new letter", () => {
    const summary = assessDrivePresence({
      projectRootPath: "E:\\Shoots\\Show",
      projectRootVolumeId: "SERIAL-E",
      drives: [drive("F", "SERIAL-E")],
    });
    expect(summary.items[0]?.status).toBe("remount");
    expect(summary.items[0]?.remount?.newPath).toBe("F:\\Shoots\\Show");
    expect(summary.editBlocked).toBe(true);
  });

  it("uses agentOnline=false even if letter list is stale", () => {
    const summary = assessDrivePresence({
      projectRootPath: "E:\\Shoots\\Show",
      drives: [drive("E", "SERIAL-E")],
      editAgentOnline: false,
    });
    expect(summary.items[0]?.status).toBe("offline");
  });

  it("checks archive separately", () => {
    const summary = assessDrivePresence({
      projectRootPath: "E:\\Shoots\\Show",
      archiveRootPath: "F:\\Backup",
      projectRootVolumeId: "SERIAL-E",
      archiveRootVolumeId: "SERIAL-F",
      drives: [drive("E", "SERIAL-E")],
    });
    expect(summary.items.find((i) => i.kind === "edit")?.status).toBe("online");
    expect(summary.items.find((i) => i.kind === "archive")?.status).toBe("offline");
    expect(summary.editBlocked).toBe(false);
    expect(summary.needsAttention).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  describePostIngestCardWipe,
  summarizeMediaSafety,
} from "@/lib/aiEditor/mediaSafety";
import type { MediaAsset } from "@/lib/aiEditor/types";

function asset(partial: Partial<MediaAsset>): MediaAsset {
  return {
    id: "ss_media_1",
    projectId: "p",
    userId: "u",
    filename: "a.mp4",
    originalFilename: "a.mp4",
    extension: "mp4",
    mediaType: "video",
    onlineStatus: "online",
    ingestStatus: "indexed",
    analysisStatus: "none",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("summarizeMediaSafety", () => {
  it("unknown with no media", () => {
    expect(summarizeMediaSafety([]).level).toBe("unknown");
  });

  it("green when all verified", () => {
    const s = summarizeMediaSafety([
      asset({ ingestStatus: "verified", verifiedCopyCount: 1 }),
      asset({ id: "2", ingestStatus: "verified", verifiedCopyCount: 1 }),
    ]);
    expect(s.level).toBe("green");
  });

  it("yellow for in-place only", () => {
    const s = summarizeMediaSafety([asset({ ingestStatus: "in_place" })]);
    expect(s.level).toBe("yellow");
  });
});

describe("describePostIngestCardWipe", () => {
  it("red when nothing copied", () => {
    const v = describePostIngestCardWipe({
      copiedOk: 0,
      failed: 2,
      stopped: false,
      cameraLabel: "CAMERA_A",
      backup: "not_requested",
    });
    expect(v.tone).toBe("red");
    expect(v.wipeGuidance.toLowerCase()).toContain("do not erase");
  });

  it("green when project + backup done", () => {
    const v = describePostIngestCardWipe({
      copiedOk: 4,
      failed: 0,
      stopped: false,
      cameraLabel: "CAMERA_A",
      backup: "done",
      backupOk: 4,
      backupFailed: 0,
    });
    expect(v.tone).toBe("green");
    expect(v.title).toMatch(/backup/i);
  });

  it("amber when project only", () => {
    const v = describePostIngestCardWipe({
      copiedOk: 3,
      failed: 0,
      stopped: false,
      cameraLabel: "A7S",
      backup: "not_requested",
    });
    expect(v.tone).toBe("amber");
    expect(v.wipeGuidance.toLowerCase()).toContain("backup");
  });
});

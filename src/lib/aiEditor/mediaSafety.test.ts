import { describe, expect, it } from "vitest";
import { summarizeMediaSafety } from "@/lib/aiEditor/mediaSafety";
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

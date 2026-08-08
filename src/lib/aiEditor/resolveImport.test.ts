import { describe, expect, it } from "vitest";
import {
  buildTimelineFromResolveSync,
  resolveImportSummary,
} from "@/lib/aiEditor/resolveImport";
import type { MediaAsset } from "@/lib/aiEditor/types";

function media(id: string, filename: string): MediaAsset {
  return {
    id,
    projectId: "p1",
    userId: "u1",
    filename,
    originalFilename: filename,
    extension: "mp4",
    mediaType: "video",
    durationSeconds: 5,
    onlineStatus: "online",
    ingestStatus: "verified",
    analysisStatus: "none",
    createdAt: "",
    updatedAt: "",
  };
}

describe("resolveImport", () => {
  it("builds a timeline from matched Resolve clips", () => {
    const result = buildTimelineFromResolveSync({
      projectId: "p1",
      media: [media("a", "hero_wide.mp4"), media("b", "react_cu.mov")],
      sync: {
        timelineName: "Grade v3",
        frameRate: 24,
        clips: [
          { name: "hero_wide", durationFrames: 48 },
          { name: "unknown_clip", durationFrames: 24 },
          { name: "react_cu.mov", durationFrames: 72 },
        ],
      },
    });

    expect(result.matched).toBe(2);
    expect(result.unmatchedNames).toContain("unknown_clip");
    const video = result.timeline.tracks.find((t) => t.kind === "video")!;
    expect(video.clips).toHaveLength(2);
    expect(video.clips[0].mediaAssetId).toBe("a");
    expect(video.clips[1].durationFrames).toBe(72);
    expect(result.timeline.name).toBe("Grade v3");
    expect(result.timeline.reels?.length).toBe(1);
    expect(resolveImportSummary(result)).toMatch(/2 clips/);
  });
});

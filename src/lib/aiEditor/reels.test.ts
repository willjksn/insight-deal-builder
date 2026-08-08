import { describe, expect, it } from "vitest";
import {
  ensureDefaultReel,
  setupFeatureReels,
  summarizeReels,
  timelineScopedToReel,
} from "@/lib/aiEditor/reels";
import { emptyTimeline } from "@/lib/aiEditor/timeline";
import type { Timeline } from "@/lib/aiEditor/types";

function withClips(count: number): Timeline {
  const tl = emptyTimeline({ projectId: "p1" });
  const video = tl.tracks.find((t) => t.kind === "video")!;
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    video.clips.push({
      id: `c${i}`,
      mediaAssetId: `m${i}`,
      trackId: video.id,
      timelineStartFrame: cursor,
      sourceInFrame: 0,
      durationFrames: 24 * 60, // 1 minute @ 24fps
      label: `Clip ${i + 1}`,
    });
    cursor += 24 * 60;
  }
  return tl;
}

describe("reels", () => {
  it("ensures a Full cut reel", () => {
    const tl = ensureDefaultReel(withClips(2));
    expect(tl.reels).toHaveLength(1);
    expect(tl.reels![0].name).toMatch(/full cut/i);
    expect(tl.tracks[0].clips.every((c) => c.reelId === tl.reels![0].id)).toBe(true);
  });

  it("sets up three acts for a feature", () => {
    const tl = setupFeatureReels(withClips(30), { mode: "acts", runtimeSeconds: 105 * 60 });
    expect(tl.reels).toHaveLength(3);
    expect(tl.reels!.map((r) => r.name)).toEqual(["Act 1", "Act 2", "Act 3"]);
    const summary = summarizeReels(tl);
    expect(summary.reduce((n, r) => n + r.clipCount, 0)).toBe(30);
  });

  it("scopes chat to the active reel", () => {
    const tl = setupFeatureReels(withClips(12), { mode: "reels", reelCount: 3 });
    const first = tl.reels![0].id;
    const { scoped, reel } = timelineScopedToReel(tl, first);
    expect(reel?.name).toBe("Reel 1");
    const n = scoped.tracks.find((t) => t.kind === "video")!.clips.length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(12);
  });
});

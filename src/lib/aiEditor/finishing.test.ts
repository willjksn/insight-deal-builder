import { describe, expect, it } from "vitest";
import {
  applyFinishingPlan,
  buildFinishingGuide,
  summarizeFinishing,
} from "@/lib/aiEditor/finishing";
import { emptyTimeline } from "@/lib/aiEditor/timeline";
import type { TimelineClip } from "@/lib/aiEditor/types";

function withClips(n: number) {
  const tl = emptyTimeline({ projectId: "p1", name: "Cut" });
  const video = tl.tracks[0];
  const clips: TimelineClip[] = Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    mediaAssetId: `m${i}`,
    trackId: video.id,
    timelineStartFrame: i * 24,
    sourceInFrame: 0,
    durationFrames: 24,
  }));
  return {
    ...tl,
    tracks: [{ ...video, clips }, tl.tracks[1]],
  };
}

describe("finishing", () => {
  it("applies soft dissolves between clips, not after last", () => {
    const { timeline, plan } = applyFinishingPlan(withClips(3), {
      moodId: "warm",
      transitionStyle: "soft_dissolves",
    });
    expect(plan.moodLabel).toBe("Warm");
    const clips = timeline.tracks[0].clips;
    expect(clips[0].transitionOut?.type).toBe("dissolve");
    expect(clips[1].transitionOut?.type).toBe("dissolve");
    expect(clips[2].transitionOut).toBeUndefined();
    expect(timeline.finishing?.transitionStyle).toBe("soft_dissolves");
  });

  it("hard cuts clear transitionOut", () => {
    const soft = applyFinishingPlan(withClips(2), {
      moodId: "natural",
      transitionStyle: "soft_dissolves",
    }).timeline;
    const hard = applyFinishingPlan(soft, {
      moodId: "natural",
      transitionStyle: "cuts",
    }).timeline;
    expect(hard.tracks[0].clips.every((c) => !c.transitionOut)).toBe(true);
  });

  it("builds a plain-language Resolve guide", () => {
    const { plan } = applyFinishingPlan(withClips(2), {
      moodId: "cinematic",
      transitionStyle: "fade_between",
    });
    const guide = buildFinishingGuide({
      plan,
      timelineName: "Cut",
      clipCount: 2,
    });
    expect(guide).toContain("Cinematic");
    expect(guide).toContain("Color page");
    expect(guide).not.toContain("EDL");
  });

  it("summarizes finishing for UI", () => {
    const { plan } = applyFinishingPlan(withClips(1), {
      moodId: "cool",
      transitionStyle: "cuts",
    });
    expect(summarizeFinishing(plan)).toBe("Cool · Hard cuts");
  });
});

import { describe, expect, it } from "vitest";
import {
  compareResolveToRoughCut,
  summarizeResolveSync,
} from "@/lib/aiEditor/resolveSync";

describe("resolveSync", () => {
  it("summarizes a snapshot", () => {
    const s = summarizeResolveSync({
      timelineName: "Final Cut",
      videoClipCount: 12,
      durationSeconds: 94.2,
    });
    expect(s).toContain("Final Cut");
    expect(s).toContain("12 clips");
    expect(s).toMatch(/94s/);
  });

  it("flags a longer Resolve cut", () => {
    const c = compareResolveToRoughCut({
      sync: {
        timelineName: "Grade v2",
        durationFrames: 2400,
        videoClipCount: 20,
        edlExported: true,
      },
      roughCutDurationFrames: 1800,
      roughCutClipCount: 14,
    });
    expect(c.lengthHint).toBe("longer");
    expect(c.title).toMatch(/Grade v2/);
    expect(c.detail).toMatch(/resolve_from_nle\.edl/i);
  });

  it("flags a shorter Resolve cut", () => {
    const c = compareResolveToRoughCut({
      sync: { timelineName: "Tight", durationFrames: 900, videoClipCount: 8 },
      roughCutDurationFrames: 1200,
      roughCutClipCount: 10,
    });
    expect(c.lengthHint).toBe("shorter");
  });
});

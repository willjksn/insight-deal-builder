import { describe, expect, it } from "vitest";
import { formatReelClipForCopy } from "@/lib/reelPrompt/format";
import { parseReelPromptPack } from "@/lib/reelPrompt/generate";
import type { ReelPromptGenerateInput } from "@/lib/reelPrompt/types";

const baseInput: ReelPromptGenerateInput = {
  style: "ugc_ad",
  toolTarget: "generic",
  platform: "reels",
  talentKitId: "stormi",
  idea: "Stormi sells a cozy night-in board game",
};

describe("parseReelPromptPack", () => {
  it("normalizes clips and stormi continuity fallback", () => {
    const pack = parseReelPromptPack(
      {
        title: "Monopoly night UGC",
        clips: [
          {
            index: 1,
            duration: "3s",
            beat: "hook",
            prompt: "Handheld phone push-in on Stormi laughing over a board game.",
          },
        ],
      },
      baseInput
    );
    expect(pack.clips).toHaveLength(1);
    expect(pack.clips[0]?.prompt).toMatch(/board game/i);
    expect(pack.continuityBlock.toLowerCase()).toContain("young woman");
    expect(pack.toolTarget).toBe("generic");
    expect(pack.style).toBe("ugc_ad");
  });

  it("formats clipboard text with continuity", () => {
    const pack = parseReelPromptPack(
      {
        title: "Test",
        continuityBlock: "Same Stormi look",
        avoid: ["no stills"],
        clips: [{ index: 1, beat: "hook", duration: "2s", prompt: "Slow dolly in." }],
      },
      baseInput
    );
    const text = formatReelClipForCopy(pack, pack.clips[0]!);
    expect(text).toContain("CONTINUITY:");
    expect(text).toContain("Same Stormi look");
    expect(text).toContain("Slow dolly in.");
  });
});

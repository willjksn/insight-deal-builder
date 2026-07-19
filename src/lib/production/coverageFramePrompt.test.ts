import { describe, expect, it } from "vitest";
import {
  buildCoverageFramePrompt,
  coverageFrameAspectRatio,
} from "@/lib/production/coverageFramePrompt";
import type { ProductionDayShot } from "@/lib/production/types";

function shot(partial: Partial<ProductionDayShot>): ProductionDayShot {
  return {
    id: "s1",
    label: "1",
    done: false,
    sortOrder: 0,
    ...partial,
  };
}

describe("buildCoverageFramePrompt", () => {
  it("includes action and DP fields", () => {
    const prompt = buildCoverageFramePrompt(
      shot({
        shotName: "Hero wide",
        shotType: "master_wide",
        description: "Talent walks into sunlit kitchen",
        lens: "35mm",
        framing: "Wide, rule of thirds",
        lighting: "Soft window key",
        sceneRef: "2",
        sceneHeading: "INT. KITCHEN - DAY",
      })
    );
    expect(prompt).toContain("Hero wide");
    expect(prompt).toContain("Talent walks into sunlit kitchen");
    expect(prompt).toContain("35mm");
    expect(prompt).toContain("Soft window key");
    expect(prompt).toContain("INT. KITCHEN - DAY");
    expect(prompt).toContain("Single image only");
  });

  it("falls back to notes when description missing", () => {
    const prompt = buildCoverageFramePrompt(
      shot({ notes: "CU on hands pouring coffee\nignore" })
    );
    expect(prompt).toContain("CU on hands pouring coffee");
  });
});

describe("coverageFrameAspectRatio", () => {
  it("uses 9:16 for vertical social", () => {
    expect(coverageFrameAspectRatio(shot({ shotType: "vertical_social_shot" }))).toBe("9:16");
  });

  it("defaults to 16:9", () => {
    expect(coverageFrameAspectRatio(shot({ shotType: "close_up" }))).toBe("16:9");
  });
});

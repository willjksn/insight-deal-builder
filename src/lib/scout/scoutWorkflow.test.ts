import { describe, expect, it } from "vitest";
import { scoutSpineStatus, scoutSpineSummary } from "@/lib/scout/scoutWorkflow";
import { ScoutProject } from "@/lib/scout/types";

const base = {
  id: "s1",
  userId: "u1",
  projectName: "Test",
  sceneType: "horror",
  sceneIdea: "Scene",
  mood: "scary",
  theme: "",
  platform: "youtube",
  aspectRatio: "16:9",
  skillLevel: "intermediate",
  preferredLook: "s_log3",
  appMode: "pro",
  status: "ready_to_plan",
} as ScoutProject;

describe("scoutSpineStatus", () => {
  it("returns empty with no sessions", () => {
    expect(scoutSpineStatus([])).toBe("empty");
  });

  it("returns progress when Q&A is complete", () => {
    expect(
      scoutSpineStatus([
        {
          ...base,
          creativeBrief: { subjectAction: "Subject sits", completedAt: "2026-01-01" },
        },
      ])
    ).toBe("progress");
  });

  it("returns ready when shot list exists", () => {
    expect(
      scoutSpineStatus([
        {
          ...base,
          latestShotList: {
            id: "sl1",
            shots: [{ shotNumber: 1, scene: "1", shotType: "master_wide" } as never],
            createdAt: {} as never,
            updatedAt: {} as never,
          },
        },
      ])
    ).toBe("ready");
  });
});

describe("scoutSpineSummary", () => {
  it("mentions Q&A when complete", () => {
    expect(
      scoutSpineSummary([
        {
          ...base,
          creativeBrief: { completedAt: "2026-01-01" },
        },
      ])
    ).toContain("Q&A complete");
  });
});

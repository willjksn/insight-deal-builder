import { describe, expect, it } from "vitest";
import {
  buildNextShootChecklist,
  checklistProgress,
  toggleChecklistItem,
} from "@/lib/aiEditor/nextShootChecklist";
import type { CoverageReport, PlanningFeedback } from "@/lib/aiEditor/types";

describe("nextShootChecklist", () => {
  it("expands missing coverage into pickup rows and preserves done state", () => {
    const coverage: CoverageReport = {
      projectId: "p1",
      updatedAt: "",
      plannedShotCount: 2,
      coveredCount: 1,
      partialCount: 0,
      missingCount: 1,
      unmatchedMediaIds: [],
      shots: [
        {
          plannedShotId: "s1",
          shotName: "Insert shelf",
          status: "missing",
          candidates: [],
        },
      ],
      overrides: [],
    };
    const feedback: PlanningFeedback = {
      keptCount: 1,
      droppedCount: 1,
      onlyInResolveCount: 0,
      droppedLabels: ["hero_wide.mp4"],
      onlyInResolveLabels: [],
      insights: [
        {
          id: "dropped_in_finish",
          severity: "suggest",
          text: "1 rough-cut clips don’t appear in Resolve",
        },
        {
          id: "preferred_dropped",
          severity: "suggest",
          text: "Preferred take(s) for Closeup didn’t make the Resolve cut",
        },
      ],
      updatedAt: "",
      timelineName: "Final",
    };

    const first = buildNextShootChecklist({ feedback, coverage });
    expect(first.items.some((i) => i.id === "missing_s1")).toBe(true);
    expect(first.items.some((i) => i.label.includes("hero_wide"))).toBe(true);
    expect(first.items.some((i) => i.id === "insight_preferred_dropped")).toBe(true);

    const toggled = toggleChecklistItem(first, "missing_s1", true);
    const rebuilt = buildNextShootChecklist({
      feedback,
      coverage,
      previous: toggled,
    });
    expect(rebuilt.items.find((i) => i.id === "missing_s1")?.done).toBe(true);
    expect(checklistProgress(rebuilt).done).toBeGreaterThanOrEqual(1);
  });
});

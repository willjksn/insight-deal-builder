import { describe, expect, it } from "vitest";
import { buildCrossProjectInsights } from "@/lib/aiEditor/crossProjectInsights";
import type { AiEditorProjectSettings } from "@/lib/aiEditor/types";

function settings(
  partial: Partial<AiEditorProjectSettings>
): AiEditorProjectSettings {
  return {
    id: "x",
    projectId: "x",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("crossProjectInsights", () => {
  it("tallies common look and coverage gaps", () => {
    const summary = buildCrossProjectInsights([
      {
        projectId: "1",
        projectName: "A",
        settings: settings({
          lastFinishingFeedback: {
            moodId: "warm",
            moodLabel: "Warm",
            transitionStyle: "cuts",
            transitionLabel: "Cuts",
            outcome: "kept_look",
            updatedAt: "",
          },
          lastPlanningFeedback: {
            keptCount: 1,
            droppedCount: 0,
            onlyInResolveCount: 0,
            droppedLabels: [],
            onlyInResolveLabels: [],
            insights: [
              { id: "missing_coverage", severity: "action", text: "missing" },
            ],
            updatedAt: "",
          },
        }),
      },
      {
        projectId: "2",
        projectName: "B",
        settings: settings({
          lastFinishingFeedback: {
            moodId: "warm",
            moodLabel: "Warm",
            transitionStyle: "cuts",
            transitionLabel: "Cuts",
            outcome: "kept_look",
            updatedAt: "",
          },
          lastPlanningFeedback: {
            keptCount: 1,
            droppedCount: 0,
            onlyInResolveCount: 0,
            droppedLabels: [],
            onlyInResolveLabels: [],
            insights: [
              { id: "missing_coverage", severity: "action", text: "missing" },
            ],
            updatedAt: "",
          },
        }),
      },
      {
        projectId: "3",
        projectName: "C",
        settings: settings({
          nextShootChecklist: {
            items: [
              {
                id: "1",
                kind: "missing_shot",
                severity: "action",
                label: "Pickup",
                done: false,
              },
            ],
            updatedAt: "",
          },
        }),
      },
    ]);

    expect(summary.withDataCount).toBe(3);
    expect(summary.insights.some((i) => i.id === "top_mood")).toBe(true);
    expect(summary.insights.some((i) => i.id === "missing_coverage")).toBe(true);
    expect(summary.insights.some((i) => i.id === "open_checklist")).toBe(true);
    expect(summary.lookDefaults?.moodId).toBe("warm");
    expect(summary.lookDefaults?.weight).toBe(2);
    expect(summary.recommendations.some((r) => r.id === "checklist-3")).toBe(true);
  });
});


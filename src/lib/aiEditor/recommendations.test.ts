import { describe, expect, it } from "vitest";
import { buildRecommendations } from "@/lib/aiEditor/recommendations";
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

describe("buildRecommendations", () => {
  it("prioritizes open checklist projects with deep links", () => {
    const recs = buildRecommendations([
      {
        projectId: "p1",
        projectName: "Wedding",
        settings: settings({
          nextShootChecklist: {
            items: [
              {
                id: "1",
                kind: "missing_shot",
                severity: "action",
                label: "B-roll",
                done: false,
              },
              {
                id: "2",
                kind: "missing_shot",
                severity: "action",
                label: "Reaction",
                done: false,
              },
            ],
            updatedAt: "2026-01-02",
          },
        }),
      },
      {
        projectId: "p2",
        projectName: "Spot",
        settings: settings({
          projectRootPath: "E:\\Shoots\\Spot",
        }),
      },
    ]);

    const checklist = recs.find((r) => r.id === "checklist-p1");
    expect(checklist?.priority).toBe("high");
    expect(checklist?.href).toBe("/projects/p1/ai-editor");
    expect(checklist?.detail).toContain("2 open");

    expect(recs.some((r) => r.id === "backup-p2")).toBe(true);
  });

  it("suggests checklist build when coverage is missing", () => {
    const recs = buildRecommendations([
      {
        projectId: "p3",
        projectName: "Doc",
        settings: settings({
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
    ]);
    expect(recs.some((r) => r.id === "build-checklist-p3")).toBe(true);
  });

  it("suggests wrap-up after Resolve sync without feedback", () => {
    const recs = buildRecommendations([
      {
        projectId: "p4",
        projectName: "Short",
        settings: settings({
          lastResolveSync: {
            timelineName: "Timeline 1",
            videoClipCount: 4,
            durationSeconds: 120,
            syncedAt: "2026-01-01",
          },
        }),
      },
    ]);
    expect(recs.some((r) => r.id === "wrapup-p4")).toBe(true);
  });

  it("ranks high before low", () => {
    const recs = buildRecommendations([
      {
        projectId: "a",
        projectName: "A",
        settings: settings({
          projectRootPath: "E:\\A",
          nextShootChecklist: {
            items: [
              {
                id: "1",
                kind: "missing_shot",
                severity: "action",
                label: "X",
                done: false,
              },
            ],
            updatedAt: "2026-01-01",
          },
        }),
      },
      {
        projectId: "b",
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
        }),
      },
      {
        projectId: "c",
        projectName: "C",
        settings: settings({
          lastFinishingFeedback: {
            moodId: "warm",
            moodLabel: "Warm",
            transitionStyle: "cuts",
            transitionLabel: "Cuts",
            outcome: "kept_look",
            updatedAt: "",
          },
        }),
      },
    ]);
    expect(recs[0]?.priority).toBe("high");
  });
});

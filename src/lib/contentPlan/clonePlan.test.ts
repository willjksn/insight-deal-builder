import { describe, expect, it } from "vitest";
import { buildClonedContentPlanPayload } from "@/lib/contentPlan/clonePlan";
import { defaultContentPlanInputs, type ContentPlan } from "@/lib/contentPlan/types";

describe("buildClonedContentPlanPayload", () => {
  it("copies content and clears project links via omission", () => {
    const source = {
      id: "p1",
      userId: "u1",
      title: "The First Sip",
      status: "ready",
      projectId: "proj-1",
      scriptSessionId: "sess-1",
      inputs: defaultContentPlanInputs({ idea: "Hybrid ad" }),
      creativeBrief: {
        workingTitle: "The First Sip",
        coreConcept: "c",
        objective: "o",
        targetViewer: "t",
        hook: "h",
        mainMessage: "m",
        emotionalGoal: "e",
        productBrandMoment: "p",
        cta: "none",
        visualStyle: "v",
        cameraPhilosophy: "c",
        editingPhilosophy: "edit",
        soundPhilosophy: "s",
        whyItWorks: "w",
      },
      beats: [],
      scriptLines: [],
      shots: [
        {
          id: "shot_01",
          shotNumber: 1,
          shotName: "Approach",
          storyPurpose: "Hook",
          startTime: "0:00",
          endTime: "0:03",
          estimatedDuration: "3s",
          visualDescription: "Walk",
          shotSize: "MS",
          movement: "Handheld",
          howToShoot: { steps: [], commonMistakes: [], continuity: [] },
          status: "planned",
        },
      ],
      progress: {
        brief: true,
        beats: false,
        script: false,
        shots: true,
        edit: false,
        sound: false,
        music: false,
        look: false,
        lighting: false,
        coverage: false,
        shootOrder: false,
        checklist: false,
      },
      teachMe: true,
    } as ContentPlan;

    const cloned = buildClonedContentPlanPayload(source);
    expect(cloned.title).toBe("The First Sip (copy)");
    expect(cloned.shots).toHaveLength(1);
    expect(cloned.teachMe).toBe(true);
    expect("projectId" in cloned).toBe(false);
    expect("scriptSessionId" in cloned).toBe(false);
  });
});

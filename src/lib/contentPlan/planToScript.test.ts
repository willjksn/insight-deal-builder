import { describe, expect, it } from "vitest";
import {
  briefFromContentPlan,
  contentPlanToScriptDocument,
} from "@/lib/contentPlan/planToScript";
import { defaultContentPlanInputs, type ContentPlan } from "@/lib/contentPlan/types";

function samplePlan(): ContentPlan {
  return {
    id: "p1",
    userId: "u1",
    title: "The First Sip",
    status: "ready",
    inputs: defaultContentPlanInputs({
      idea: "Post-workout sparkling water hybrid ad",
      creatorName: "Stormi",
      location: "Kitchen",
      durationSeconds: 30,
      contentStyle: "hybrid",
    }),
    creativeBrief: {
      workingTitle: "The First Sip",
      coreConcept: "Exhausted to refresh",
      objective: "Sell the drink",
      targetViewer: "Fitness creators",
      hook: "Show exhaustion first",
      mainMessage: "Refresh",
      emotionalGoal: "Relief",
      productBrandMoment: "First sip",
      cta: "Shop now",
      visualStyle: "Hybrid",
      cameraPhilosophy: "Natural + inserts",
      editingPhilosophy: "Cut on action",
      soundPhilosophy: "Product foley",
      whyItWorks: "Relatable",
    },
    beats: [],
    scriptLines: [
      {
        id: "l1",
        speaker: "STORMI",
        dialogue: "Okay, this is exactly what I needed.",
        kind: "direct",
        delivery: "Natural",
      },
    ],
    shots: [
      {
        id: "shot_01",
        shotNumber: 1,
        shotName: "Approach",
        storyPurpose: "Hook",
        startTime: "0:00",
        endTime: "0:03",
        estimatedDuration: "3s",
        visualDescription: "Walks to fridge",
        shotSize: "MS",
        movement: "Handheld",
        howToShoot: { steps: ["Set 35mm"], commonMistakes: [], continuity: [] },
        status: "planned",
        cutTrigger: "Hand hits handle",
      },
    ],
    progress: {
      brief: true,
      beats: true,
      script: true,
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
  };
}

describe("contentPlanToScriptDocument", () => {
  it("maps shots and dialogue into a script the apply pipeline can use", () => {
    const script = contentPlanToScriptDocument(samplePlan());
    expect(script.title).toBe("The First Sip");
    expect(script.suggestedShots).toHaveLength(1);
    expect(script.suggestedShots[0]?.shotName).toBe("Approach");
    expect(script.suggestedShots[0]?.contentPlanShotId).toBe("shot_01");
    expect(script.scenes[0]?.dialogue[0]?.line).toContain("exactly what I needed");
    expect(script.fountain).toContain("STORMI");
  });

  it("builds a valid brief", () => {
    const brief = briefFromContentPlan(samplePlan());
    expect(brief.contentType).toBe("social_reel");
    expect(brief.runtime).toBe("30s");
  });
});

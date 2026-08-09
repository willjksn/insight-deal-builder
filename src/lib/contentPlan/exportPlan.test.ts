import { describe, expect, it } from "vitest";
import {
  buildContentPlanExportJson,
  buildContentPlanPrintable,
} from "@/lib/contentPlan/exportPlan";
import { defaultContentPlanInputs, type ContentPlan } from "@/lib/contentPlan/types";

const plan = {
  id: "p1",
  userId: "u1",
  title: "Test",
  status: "ready",
  inputs: defaultContentPlanInputs({ idea: "Hybrid ad", durationSeconds: 30 }),
  creativeBrief: {
    workingTitle: "Test",
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
  beats: [{ id: "b1", startTime: "0:00", endTime: "0:03", label: "Hook", description: "Open" }],
  scriptLines: [],
  shots: [
    {
      id: "shot_01",
      shotNumber: 1,
      shotName: "Open",
      storyPurpose: "Hook",
      startTime: "0:00",
      endTime: "0:03",
      estimatedDuration: "3s",
      visualDescription: "Walk in",
      shotSize: "MS",
      movement: "Locked",
      howToShoot: { steps: ["Roll"], commonMistakes: [], continuity: [] },
      status: "planned",
    },
  ],
  progress: {
    brief: true,
    beats: true,
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

describe("contentPlan export", () => {
  it("builds json export", () => {
    const json = buildContentPlanExportJson(plan);
    expect(json.version).toBe(1);
    expect(json.shots).toHaveLength(1);
  });

  it("builds printable text", () => {
    const text = buildContentPlanPrintable(plan);
    expect(text).toContain("## Shot list");
    expect(text).toContain("Walk in");
  });
});

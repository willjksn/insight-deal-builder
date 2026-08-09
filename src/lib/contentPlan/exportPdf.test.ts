import { describe, expect, it, vi } from "vitest";
import {
  downloadContentPlanOnePagerPdf,
  downloadContentPlanPdf,
  getContentPlanOnePagerFilename,
  getContentPlanPdfFilename,
} from "@/lib/contentPlan/exportPdf";
import { defaultContentPlanInputs, type ContentPlan } from "@/lib/contentPlan/types";

vi.mock("jspdf", () => {
  const instances: Array<{ save: ReturnType<typeof vi.fn> }> = [];
  class MockJsPDF {
    internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } };
    save = vi.fn();
    setFont = vi.fn();
    setFontSize = vi.fn();
    setTextColor = vi.fn();
    text = vi.fn();
    splitTextToSize = (text: string) => String(text).split("\n");
    addPage = vi.fn();
    constructor() {
      instances.push(this);
    }
  }
  return { default: MockJsPDF, __instances: instances };
});

const plan = {
  id: "p1",
  userId: "u1",
  title: "The First Sip",
  status: "ready",
  inputs: defaultContentPlanInputs({ idea: "Hybrid ad", durationSeconds: 30 }),
  creativeBrief: {
    workingTitle: "The First Sip",
    coreConcept: "Exhausted to refresh",
    objective: "Sell",
    targetViewer: "Fitness",
    hook: "Show exhaustion",
    mainMessage: "Refresh",
    emotionalGoal: "Relief",
    productBrandMoment: "Sip",
    cta: "Shop",
    visualStyle: "Hybrid",
    cameraPhilosophy: "Natural",
    editingPhilosophy: "Cut on action",
    soundPhilosophy: "Foley",
    whyItWorks: "Relatable",
  },
  beats: [{ id: "b1", startTime: "0:00", endTime: "0:03", label: "Hook", description: "Open" }],
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
      visualDescription: "Walks in",
      shotSize: "MS",
      movement: "Handheld",
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

describe("contentPlan exportPdf", () => {
  it("builds a safe filename", () => {
    expect(getContentPlanPdfFilename(plan)).toBe("The-First-Sip-content-plan.pdf");
  });

  it("saves a pdf named from the working title", async () => {
    downloadContentPlanPdf(plan);
    const mod = await import("jspdf");
    const instances = (mod as unknown as { __instances: Array<{ save: ReturnType<typeof vi.fn> }> })
      .__instances;
    expect(instances.at(-1)?.save).toHaveBeenCalledWith("The-First-Sip-content-plan.pdf");
  });

  it("builds a one-pager filename", () => {
    expect(getContentPlanOnePagerFilename(plan)).toBe(
      "The-First-Sip-onset-one-pager.pdf"
    );
  });

  it("saves an on-set one-pager pdf", async () => {
    downloadContentPlanOnePagerPdf(plan);
    const mod = await import("jspdf");
    const instances = (mod as unknown as { __instances: Array<{ save: ReturnType<typeof vi.fn> }> })
      .__instances;
    expect(instances.at(-1)?.save).toHaveBeenCalledWith(
      "The-First-Sip-onset-one-pager.pdf"
    );
  });
});

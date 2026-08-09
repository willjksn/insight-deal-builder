import { describe, expect, it } from "vitest";
import {
  parseCoveragePlan,
  parseShootChecklist,
  parseShootOrderPlan,
} from "@/lib/contentPlan/parsePhase3";
import { computeCompletionStats, type ContentPlan } from "@/lib/contentPlan/types";

describe("contentPlan phase3 parse", () => {
  it("parses coverage + shoot order + checklist", () => {
    const coverage = parseCoveragePlan({
      overview: "Fridge moment coverage",
      moments: [
        {
          title: "Fridge",
          required: [{ label: "Master", status: "planned", critical: true }],
          optional: [{ label: "Wide", status: "optional" }],
        },
      ],
      missing: [{ label: "Product hero", status: "missing", critical: true }],
      pickupsBeforeWrap: ["Room tone"],
      warnings: ["No reaction CU"],
    });
    expect(coverage.moments[0]?.required[0]?.label).toBe("Master");
    expect(coverage.pickupsBeforeWrap).toContain("Room tone");

    const order = parseShootOrderPlan({
      storyOrder: [{ shotId: "shot_01", shotNumber: 1, shotName: "A" }],
      shootOrder: [{ shotId: "shot_02", shotNumber: 2, shotName: "B" }],
      setupChangeCount: 2,
    });
    expect(order.shootOrder[0]?.shotId).toBe("shot_02");

    const checklist = parseShootChecklist({
      beforeShooting: ["Format media"],
      beforeMovingCamera: [{ label: "Master", done: false }],
      beforeWrap: ["Room tone"],
    });
    expect(checklist.beforeShooting[0]?.label).toBe("Format media");
  });

  it("computes completion stats", () => {
    const plan = {
      shots: [
        { id: "a", status: "completed", coveragePriority: "required" },
        { id: "b", status: "planned", coveragePriority: "required" },
        { id: "c", status: "needs_pickup", pickupNeeded: true },
      ],
      coveragePlan: {
        planned: [{ id: "p1", label: "Master", category: "m", status: "captured" }],
        missing: [{ id: "m1", label: "Hero", category: "p", status: "missing", critical: true }],
        moments: [],
        pickupsBeforeWrap: ["Wild line"],
        warnings: [],
        overview: "",
      },
    } as unknown as ContentPlan;

    const stats = computeCompletionStats(plan);
    expect(stats.completedShots).toBe(1);
    expect(stats.criticalRemaining).toBe(1);
    expect(stats.coveragePercent).toBe(50);
  });
});

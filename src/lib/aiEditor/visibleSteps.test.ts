import { describe, expect, it } from "vitest";
import {
  buildDisplayStepNumbers,
  listVisibleLogicalSteps,
} from "@/lib/aiEditor/visibleSteps";

describe("visibleSteps", () => {
  it("renumbers when plan + prepare are hidden", () => {
    const nums = buildDisplayStepNumbers({
      showPrepare: false,
      showPlanSteps: false,
    });
    expect(listVisibleLogicalSteps({ showPrepare: false, showPlanSteps: false })).toEqual([
      "connect",
      "footage",
      "rough_cut",
      "chat",
      "look",
      "resolve",
      "archive",
      "wrap_up",
    ]);
    expect(nums.connect).toBe(1);
    expect(nums.footage).toBe(2);
    expect(nums.rough_cut).toBe(3);
    expect(nums.look).toBe(5);
    expect(nums.resolve).toBe(6);
  });

  it("keeps plan steps when linked to a shot list", () => {
    const nums = buildDisplayStepNumbers({
      showPrepare: true,
      showPlanSteps: true,
    });
    expect(nums.prepare).toBe(3);
    expect(nums.analyze).toBe(4);
    expect(nums.match).toBe(5);
    expect(nums.rough_cut).toBe(6);
    expect(nums.resolve).toBe(9);
  });
});

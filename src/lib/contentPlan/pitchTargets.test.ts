import { describe, expect, it } from "vitest";
import {
  capPitchTargets,
  remainingPitchTargets,
  totalTargetCount,
} from "@/lib/contentPlan/pitchTargets";

describe("pitchTargets", () => {
  it("computes remaining slots from package deliverables", () => {
    const remaining = remainingPitchTargets(
      [
        { name: "Edited reels", quantity: 10 },
        { name: "Cinematic promos", quantity: 3 },
      ],
      [
        { id: "1", oneLiner: "a", deliverableName: "Edited reels" },
        { id: "2", oneLiner: "b", deliverableName: "Edited reels" },
      ]
    );
    expect(remaining).toEqual([
      { deliverableName: "Edited reels", count: 8 },
      { deliverableName: "Cinematic promos", count: 3 },
    ]);
  });

  it("caps a batch at 15", () => {
    const capped = capPitchTargets(
      [
        { deliverableName: "Edited reels", count: 10 },
        { deliverableName: "Cinematic promos", count: 3 },
        { deliverableName: "Stories", count: 5 },
      ],
      15
    );
    expect(totalTargetCount(capped)).toBe(15);
    expect(capped).toEqual([
      { deliverableName: "Edited reels", count: 10 },
      { deliverableName: "Cinematic promos", count: 3 },
      { deliverableName: "Stories", count: 2 },
    ]);
  });
});

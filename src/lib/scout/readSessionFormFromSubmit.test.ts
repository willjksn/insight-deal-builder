import { describe, expect, it } from "vitest";
import { validateScoutSessionForm } from "@/lib/scout/readSessionFormFromSubmit";

describe("validateScoutSessionForm", () => {
  it("flags missing scene idea", () => {
    const result = validateScoutSessionForm({
      projectName: "Test session",
      sceneIdea: "   ",
    });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.sceneIdea).toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import {
  getWorkflowNextStep,
  type WorkflowStepFlags,
} from "@/lib/aiEditor/workflowNextStep";

function flags(partial: Partial<WorkflowStepFlags>): WorkflowStepFlags {
  return {
    connected: false,
    hasProjectRoot: false,
    hasMedia: false,
    prepareDone: false,
    analyzeDone: false,
    matchDone: false,
    roughCutDone: false,
    chatDone: false,
    lookDone: false,
    resolveDone: false,
    archiveDone: false,
    wrapUpDone: false,
    ...partial,
  };
}

describe("getWorkflowNextStep", () => {
  it("starts at connect", () => {
    const next = getWorkflowNextStep(flags({}));
    expect(next?.n).toBe(1);
    expect(next?.anchor).toBe("ai-step-1");
  });

  it("skips completed early steps", () => {
    const next = getWorkflowNextStep(
      flags({
        connected: true,
        hasProjectRoot: true,
        hasMedia: true,
        prepareDone: true,
      })
    );
    expect(next?.id).toBe("analyze");
    expect(next?.n).toBe(5);
  });

  it("returns null when all steps are done", () => {
    expect(
      getWorkflowNextStep(
        flags({
          connected: true,
          hasProjectRoot: true,
          hasMedia: true,
          prepareDone: true,
          analyzeDone: true,
          matchDone: true,
          roughCutDone: true,
          chatDone: true,
          lookDone: true,
          resolveDone: true,
          archiveDone: true,
          wrapUpDone: true,
        })
      )
    ).toBeNull();
  });
});

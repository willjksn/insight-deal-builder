import { describe, expect, it } from "vitest";
import {
  buildFinishingFeedback,
  defaultsForLookStep,
  defaultsFromFeedback,
  summarizeFeedback,
} from "@/lib/aiEditor/feedback";

describe("feedback", () => {
  it("builds feedback record", () => {
    const f = buildFinishingFeedback({
      moodId: "warm",
      transitionStyle: "soft_dissolves",
      outcome: "kept_look",
      note: "  loved it ",
    });
    expect(f.moodLabel).toBe("Warm");
    expect(f.transitionLabel).toBe("Soft blends");
    expect(f.note).toBe("loved it");
  });

  it("remembers look when kept", () => {
    const f = buildFinishingFeedback({
      moodId: "cinematic",
      transitionStyle: "fade_between",
      outcome: "kept_look",
    });
    const d = defaultsFromFeedback(f);
    expect(d.moodId).toBe("cinematic");
    expect(d.transitionStyle).toBe("fade_between");
    expect(d.hint).toMatch(/Remembering/i);
  });

  it("resets defaults when started fresh", () => {
    const f = buildFinishingFeedback({
      moodId: "high_energy",
      transitionStyle: "soft_dissolves",
      outcome: "started_fresh",
    });
    const d = defaultsFromFeedback(f);
    expect(d.moodId).toBe("natural");
    expect(d.transitionStyle).toBe("cuts");
  });

  it("summarizes for UI", () => {
    const f = buildFinishingFeedback({
      moodId: "cool",
      transitionStyle: "cuts",
      outcome: "tweaked_in_resolve",
    });
    expect(summarizeFeedback(f)).toContain("Tweaked");
    expect(summarizeFeedback(f)).toContain("Cool");
  });

  it("prefers project feedback over cross-project defaults", () => {
    const f = buildFinishingFeedback({
      moodId: "cool",
      transitionStyle: "cuts",
      outcome: "kept_look",
    });
    const d = defaultsForLookStep({
      feedback: f,
      crossProject: {
        moodId: "warm",
        transitionStyle: "soft_dissolves",
        hint: "From other edits",
      },
    });
    expect(d.moodId).toBe("cool");
  });

  it("uses cross-project defaults when no wrap-up", () => {
    const d = defaultsForLookStep({
      feedback: null,
      crossProject: {
        moodId: "warm",
        transitionStyle: "soft_dissolves",
        hint: "From your other edits",
      },
    });
    expect(d.moodId).toBe("warm");
    expect(d.hint).toMatch(/other edits/i);
  });
});

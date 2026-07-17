import { describe, expect, it } from "vitest";
import {
  compileDiscoveryCallNotes,
  hasDiscoveryAnswers,
  questionNotesFromPrep,
  resolveDiscoveryQuestionNotes,
} from "@/lib/revenueOpportunities/discovery/callNotes";

describe("discovery call notes", () => {
  it("builds compiled notes from Q&A", () => {
    const notes = questionNotesFromPrep(["Budget?", "Timeline?"]);
    notes[0].answer = "$15k range";
    const compiled = compileDiscoveryCallNotes(notes, "Decision maker is the owner.");
    expect(compiled).toContain("Q: Budget?");
    expect(compiled).toContain("A: $15k range");
    expect(compiled).toContain("Additional call notes:");
  });

  it("requires at least one answer or additional notes", () => {
    expect(hasDiscoveryAnswers(questionNotesFromPrep(["Q1"]), "", "")).toBe(false);
    expect(hasDiscoveryAnswers([{ id: "1", question: "Q", answer: "Yes" }], "", "")).toBe(true);
    expect(hasDiscoveryAnswers([], "extra", "")).toBe(true);
  });

  it("merges saved notes with current prep questions", () => {
    const merged = resolveDiscoveryQuestionNotes(
      { questionsToAsk: ["New Q?", "Second?"] } as never,
      [{ id: "old", question: "New Q?", answer: "saved" }]
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].answer).toBe("saved");
    expect(merged[1].question).toBe("Second?");
  });
});

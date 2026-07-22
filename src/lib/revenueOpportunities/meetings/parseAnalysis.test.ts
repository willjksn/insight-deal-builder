import { describe, expect, it } from "vitest";
import {
  parseMeetingAnalysis,
  parseTranscript,
} from "@/lib/revenueOpportunities/meetings/parseAnalysis";

describe("parseTranscript", () => {
  it("parses segments and coerces timings", () => {
    const t = parseTranscript({
      text: "Hello there.",
      segments: [
        { start: "0", end: 5, speaker: "Speaker 1", text: " Hello " },
        { text: "" }, // dropped (empty)
      ],
      durationSeconds: "5",
    });
    expect(t.text).toBe("Hello there.");
    expect(t.segments).toHaveLength(1);
    expect(t.segments[0]).toMatchObject({ start: 0, end: 5, speaker: "Speaker 1", text: "Hello" });
    expect(t.durationSeconds).toBe(5);
  });

  it("falls back to building text from segments", () => {
    const t = parseTranscript({
      segments: [
        { speaker: "A", text: "Hi" },
        { speaker: "B", text: "Yo" },
      ],
    });
    expect(t.text).toBe("A: Hi\nB: Yo");
  });
});

describe("parseMeetingAnalysis", () => {
  it("parses lists, action items, and whitelisted extracted fields", () => {
    const a = parseMeetingAnalysis({
      summary: "  A quick sync.  ",
      decisions: ["Proceed", "Proceed"], // dedupe
      actionItems: ["Send proposal", { text: "Book follow-up", owner: "IMG", dueDate: "2026-08-01" }],
      risks: ["Budget unclear"],
      nextSteps: ["Follow up"],
      extractedFields: [
        { field: "nextAction", suggestedValue: "Send proposal", confidence: 85, rationale: "asked for pricing" },
        { field: "notAField", suggestedValue: "ignored" }, // dropped (not whitelisted)
        { field: "budget", suggestedValue: "" }, // dropped (empty value)
      ],
    });
    expect(a.summary).toBe("A quick sync.");
    expect(a.decisions).toEqual(["Proceed"]);
    expect(a.actionItems).toEqual([
      { text: "Send proposal" },
      { text: "Book follow-up", owner: "IMG", dueDate: "2026-08-01" },
    ]);
    expect(a.extractedFields).toHaveLength(1);
    expect(a.extractedFields[0]).toMatchObject({
      target: "opportunity",
      field: "nextAction",
      suggestedValue: "Send proposal",
      status: "pending",
    });
    expect(a.extractedFields[0].confidence).toBeCloseTo(0.85);
    expect(a.extractedFields[0].id).toBeTruthy();
    expect(a.source).toBe("ai");
  });

  it("tolerates missing fields and marks mock source", () => {
    const a = parseMeetingAnalysis({}, "mock");
    expect(a.decisions).toEqual([]);
    expect(a.actionItems).toEqual([]);
    expect(a.extractedFields).toEqual([]);
    expect(a.source).toBe("mock");
  });
});

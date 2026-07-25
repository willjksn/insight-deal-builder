import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCRIPT_BRIEF,
  SPICY_STYLE_DIRECTIVE,
  ScriptWriterBrief,
  formatBriefForPrompt,
} from "./brief";

function makeBrief(overrides: Partial<ScriptWriterBrief> = {}): ScriptWriterBrief {
  return { ...DEFAULT_SCRIPT_BRIEF, concept: "A quiet dinner", ...overrides };
}

describe("formatBriefForPrompt spicy mode", () => {
  it("defaults to spicy mode off", () => {
    expect(DEFAULT_SCRIPT_BRIEF.spicyMode).toBe(false);
  });

  it("omits the spicy directive when spicyMode is false", () => {
    const prompt = formatBriefForPrompt(makeBrief({ spicyMode: false }));
    expect(prompt).not.toContain("SPICY MODE");
  });

  it("omits the spicy directive when spicyMode is undefined", () => {
    const prompt = formatBriefForPrompt(makeBrief({ spicyMode: undefined }));
    expect(prompt).not.toContain("SPICY MODE");
  });

  it("injects the full spicy directive when spicyMode is true", () => {
    const prompt = formatBriefForPrompt(makeBrief({ spicyMode: true }));
    expect(prompt).toContain(SPICY_STYLE_DIRECTIVE);
    // Guardrails must be present so the tone stays adults-only and non-explicit.
    expect(prompt).toContain("ADULTS ONLY (18+)");
    expect(prompt).toContain("JUST SHORT OF EXPLICIT");
    expect(prompt).toContain("never pornographic");
  });

  it("applies spicy tone to any content type, not just commercials", () => {
    const prompt = formatBriefForPrompt(
      makeBrief({ contentType: "short_film", runtime: "5_10min", spicyMode: true })
    );
    expect(prompt).toContain("SPICY MODE");
    expect(prompt).toContain("not only ads");
  });
});

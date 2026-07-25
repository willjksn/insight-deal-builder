import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateScriptIdeas } from "@/lib/scriptWriter/ideaSpark";
import { DEFAULT_SCRIPT_BRIEF } from "@/lib/scriptWriter/brief";

describe("generateScriptIdeas — mock mode", () => {
  const prev = process.env.SCOUT_USE_MOCK_AI;
  beforeAll(() => {
    process.env.SCOUT_USE_MOCK_AI = "true";
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.SCOUT_USE_MOCK_AI;
    else process.env.SCOUT_USE_MOCK_AI = prev;
  });

  it("returns a handful of well-formed suggestions without a concept", async () => {
    const brief = { ...DEFAULT_SCRIPT_BRIEF, concept: "" };
    const { ideas, usedTrends } = await generateScriptIdeas(brief);

    expect(ideas.length).toBeGreaterThanOrEqual(3);
    expect(usedTrends).toBe(false);
    for (const idea of ideas) {
      expect(idea.title.trim().length).toBeGreaterThan(0);
      expect(idea.logline.trim().length).toBeGreaterThan(0);
    }
  });

  it("reflects the requested tone/format in mock output", async () => {
    const brief = {
      ...DEFAULT_SCRIPT_BRIEF,
      contentType: "short_film" as const,
      mood: "moody_cinematic" as const,
      concept: "",
    };
    const { ideas } = await generateScriptIdeas(brief);
    expect(ideas[0].logline.toLowerCase()).toContain("short film");
  });
});

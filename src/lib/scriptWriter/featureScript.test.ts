import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assembleFeatureScript,
  expandFeatureAct,
  generateFeatureOutline,
} from "@/lib/scriptWriter/featureScript";
import { DEFAULT_SCRIPT_BRIEF } from "@/lib/scriptWriter/brief";
import { FeatureActDraft, FeatureOutline } from "@/lib/scriptWriter/types";

const brief = { ...DEFAULT_SCRIPT_BRIEF, concept: "A heist gone wrong", runtime: "feature" as const };

const outline: FeatureOutline = {
  title: "The Long Con",
  logline: "A retired thief is pulled into one last job.",
  theme: "Loyalty vs. self-preservation",
  genre: "crime thriller",
  toneStatement: "Cold, tense, neon-lit",
  characters: [
    { name: "ANA", role: "protagonist", description: "Retired thief", arc: "Learns to trust again" },
    { name: "REY", role: "antagonist", description: "The fixer" },
  ],
  acts: [
    { index: 0, title: "The Offer", goal: "Pull Ana back in", beats: ["b1", "b2"] },
    { index: 1, title: "The Job", goal: "Execute the heist", beats: ["b3", "b4"] },
  ],
  createdAt: new Date().toISOString(),
};

function act(index: number, sceneCount: number): FeatureActDraft {
  return {
    index,
    title: outline.acts[index].title,
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      sceneNumber: String(i + 1),
      heading: `INT. ROOM ${index}-${i} - NIGHT`,
      action: `Action for act ${index} scene ${i}.`,
      dialogue: [{ character: "ANA", line: "Let's move." }],
    })),
    summary: `Act ${index} summary.`,
    createdAt: new Date().toISOString(),
  };
}

describe("assembleFeatureScript", () => {
  it("merges acts, renumbers scenes sequentially, and produces a valid document", () => {
    const doc = assembleFeatureScript(brief, outline, [act(1, 2), act(0, 3)]);

    expect(doc.title).toBe("The Long Con");
    expect(doc.logline).toBe(outline.logline);
    // 3 scenes from act 0 + 2 from act 1, ordered by act index
    expect(doc.scenes).toHaveLength(5);
    expect(doc.scenes.map((s) => s.sceneNumber)).toEqual(["1", "2", "3", "4", "5"]);
    // first scene must come from act 0 (its heading references act 0)
    expect(doc.scenes[0].heading).toContain("ROOM 0-");
    expect(doc.scenes[3].heading).toContain("ROOM 1-");
    // characters carried from outline bios
    expect(doc.characters.map((c) => c.name)).toContain("ANA");
    // normalized document has screenplay elements + fountain
    expect(doc.elements && doc.elements.length).toBeGreaterThan(0);
    expect(doc.fountain.trim().length).toBeGreaterThan(0);
  });
});

describe("feature passes (mock mode)", () => {
  const prev = process.env.SCOUT_USE_MOCK_AI;
  beforeAll(() => {
    process.env.SCOUT_USE_MOCK_AI = "true";
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.SCOUT_USE_MOCK_AI;
    else process.env.SCOUT_USE_MOCK_AI = prev;
  });

  it("produces an outline then expands an act with continuity summary", async () => {
    const out = await generateFeatureOutline(brief);
    expect(out.acts.length).toBeGreaterThanOrEqual(3);
    expect(out.logline.length).toBeGreaterThan(0);

    const draft = await expandFeatureAct(brief, out, 0, []);
    expect(draft.index).toBe(0);
    expect(draft.scenes.length).toBeGreaterThan(0);
    expect(draft.summary.length).toBeGreaterThan(0);
    // dialogue entries must not carry an undefined parenthetical key
    for (const scene of draft.scenes) {
      for (const line of scene.dialogue) {
        expect(Object.prototype.hasOwnProperty.call(line, "parenthetical")).toBe(false);
      }
    }
  });
});

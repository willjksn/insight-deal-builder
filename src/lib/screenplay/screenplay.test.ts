import { describe, expect, it } from "vitest";
import { detectElementType, normalizeElementText } from "@/lib/screenplay/detect";
import { elementsToFountain, fountainToElements } from "@/lib/screenplay/fountain";
import { normalizeScriptDocument } from "@/lib/screenplay/normalize";
import { validateScreenplay } from "@/lib/screenplay/validate";
import { ScriptDocument } from "@/lib/scriptWriter/types";

describe("detectElementType", () => {
  it("detects scene headings and transitions", () => {
    expect(detectElementType("INT. WAREHOUSE STUDIO - DAY")).toBe("scene_heading");
    expect(detectElementType("CUT TO:")).toBe("transition");
  });

  it("detects character then dialogue flow", () => {
    expect(detectElementType("JANE")).toBe("character");
    expect(detectElementType("Make it a double.", "character")).toBe("dialogue");
  });
});

describe("normalizeElementText", () => {
  it("uppercases sluglines and wraps parentheticals", () => {
    expect(normalizeElementText("scene_heading", "int. kitchen - night")).toBe(
      "INT. KITCHEN - NIGHT"
    );
    expect(normalizeElementText("parenthetical", "whispering")).toBe("(whispering)");
  });
});

describe("fountain conversion", () => {
  it("round trips screenplay blocks", () => {
    const fountain = `INT. WAREHOUSE STUDIO - DAY

The crew finishes a quick lighting check.

MARCUS
(into coms)
Stand on your mark.

ELENA
Copy that.

CUT TO:`;

    const elements = fountainToElements(fountain);
    expect(elements.some((element) => element.type === "scene_heading")).toBe(true);
    expect(elements.some((element) => element.type === "dialogue")).toBe(true);
    expect(elementsToFountain(elements)).toContain("INT. WAREHOUSE STUDIO - DAY");
    expect(elementsToFountain(elements)).toContain("MARCUS");
  });
});

describe("normalizeScriptDocument", () => {
  it("builds elements from fountain when missing", () => {
    const script = normalizeScriptDocument({
      title: "Test",
      logline: "A test",
      fountain: "INT. OFFICE - DAY\n\nAction line.",
      scenes: [],
      characters: [],
      suggestedShots: [],
    });
    expect(script.elements?.length).toBeGreaterThan(0);
    expect(script.fountain).toContain("INT. OFFICE - DAY");
  });
});

describe("validateScreenplay", () => {
  it("flags missing title", () => {
    const script: ScriptDocument = {
      title: "",
      logline: "",
      fountain: "INT. OFFICE - DAY\n\nAction.",
      scenes: [],
      characters: [],
      suggestedShots: [],
    };
    const result = validateScreenplay(normalizeScriptDocument(script));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "missing_title")).toBe(true);
  });
});

describe("prepareScriptDocumentForFirestore", () => {
  it("removes undefined optional element fields", async () => {
    const { prepareScriptDocumentForFirestore } = await import("@/lib/screenplay/serialize");
    const { createScriptElement } = await import("@/lib/screenplay/elements");

    const script = prepareScriptDocumentForFirestore({
      title: "Test",
      logline: "Logline",
      fountain: "INT. OFFICE - DAY\n\nAction.",
      elements: [createScriptElement("scene_heading", "INT. OFFICE - DAY", 0)],
      scenes: [],
      characters: [],
      suggestedShots: [],
    });

    expect(script.elements?.[0]).not.toHaveProperty("pageNumber");
    expect(Object.values(script.elements?.[0] ?? {})).not.toContain(undefined);
  });
});

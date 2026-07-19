import { describe, expect, it } from "vitest";
import { createScriptElement } from "@/lib/screenplay/elements";
import {
  deleteEmptyElement,
  looksLikeScreenplayPaste,
  mergeElementWithPrevious,
  pasteScreenplayAt,
} from "@/lib/screenplay/editorActions";

describe("editorActions", () => {
  it("detects fountain-like paste", () => {
    expect(looksLikeScreenplayPaste("INT. ROOM - DAY\n\nShe enters.")).toBe(true);
    expect(looksLikeScreenplayPaste("hello")).toBe(false);
    expect(
      looksLikeScreenplayPaste("ELENA\nWe're ready.\n\nMARCUS\nCopy.")
    ).toBe(true);
  });

  it("merges with previous on backspace semantics", () => {
    const elements = [
      createScriptElement("action", "First", 0),
      createScriptElement("action", "Second", 1),
    ];
    const result = mergeElementWithPrevious(elements, 1);
    expect(result).not.toBeNull();
    expect(result!.elements).toHaveLength(1);
    expect(result!.elements[0].text).toBe("First Second");
    expect(result!.caret).toBe(5);
  });

  it("deletes empty element", () => {
    const elements = [
      createScriptElement("action", "Keep", 0),
      createScriptElement("action", "", 1),
    ];
    const result = deleteEmptyElement(elements, 1);
    expect(result).not.toBeNull();
    expect(result!.elements).toHaveLength(1);
    expect(result!.elements[0].text).toBe("Keep");
  });

  it("pastes screenplay blocks after current", () => {
    const elements = [createScriptElement("action", "Existing", 0)];
    const next = pasteScreenplayAt(
      elements,
      0,
      "INT. STUDIO - DAY\n\nElena marks the floor.\n\nELENA\nReady."
    );
    expect(next.length).toBeGreaterThan(2);
    expect(next[0].text).toBe("Existing");
    expect(next.some((e) => e.type === "scene_heading")).toBe(true);
  });

  it("replaces empty current on paste", () => {
    const elements = [createScriptElement("action", "", 0)];
    const next = pasteScreenplayAt(elements, 0, "INT. ROOM - NIGHT\n\nDarkness.");
    expect(next[0].type).toBe("scene_heading");
  });
});

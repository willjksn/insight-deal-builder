import { describe, expect, it } from "vitest";
import { createScriptElement } from "@/lib/screenplay/elements";
import {
  deleteEmptyElement,
  looksLikeScreenplayPaste,
  mergeElementWithPrevious,
  nextTypeAfterEmptyEnter,
  pasteScreenplayAt,
  pasteScreenplayReplacingSelection,
} from "@/lib/screenplay/editorActions";
import { tabElementType } from "@/lib/screenplay/types";

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

  it("pastes over a selection inside a block", () => {
    const elements = [createScriptElement("action", "AAA KEEP BBB", 0)];
    const next = pasteScreenplayReplacingSelection(
      elements,
      0,
      4,
      8,
      "INT. ROOM - DAY\n\nShe enters."
    );
    expect(next[0].text).toBe("AAA");
    expect(next.some((e) => e.type === "scene_heading")).toBe(true);
    expect(next[next.length - 1].text).toBe("BBB");
  });

  it("maps empty dialogue enter to character", () => {
    expect(nextTypeAfterEmptyEnter("dialogue")).toBe("character");
    expect(nextTypeAfterEmptyEnter("action")).toBeNull();
  });

  it("tabs along Final Draft dialogue spine", () => {
    expect(tabElementType("action", "forward")).toBe("character");
    expect(tabElementType("character", "forward")).toBe("dialogue");
    expect(tabElementType("dialogue", "forward")).toBe("parenthetical");
    expect(tabElementType("parenthetical", "backward")).toBe("dialogue");
  });
});

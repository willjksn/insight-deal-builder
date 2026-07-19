import { fountainToElements } from "@/lib/screenplay/fountain";
import { createScriptElement, reindexElements } from "@/lib/screenplay/elements";
import type { ScriptElement, ScriptElementType } from "@/lib/screenplay/types";

/** True when clipboard text looks like multi-block screenplay / Fountain. */
export function looksLikeScreenplayPaste(text: string): boolean {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return false;
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  if (/^(INT\.|EXT\.|INT\.\/EXT\.|EST\.)/i.test(lines[0])) return true;
  if (lines.some((l) => /^(CUT TO:|FADE IN:|FADE OUT)/i.test(l))) return true;
  // Character (ALL CAPS) followed by dialogue-ish line
  const hasCharacter = lines.some(
    (l) => /^[A-Z0-9][A-Z0-9 .'\-()]*$/.test(l) && l.length <= 40 && !l.endsWith(":")
  );
  return hasCharacter && lines.length >= 3;
}

export function mergeElementWithPrevious(
  elements: ScriptElement[],
  index: number
): { elements: ScriptElement[]; focusId: string; caret: number } | null {
  if (index <= 0 || index >= elements.length) return null;
  const prev = elements[index - 1];
  const current = elements[index];
  const caret = prev.text.length;
  const joined =
    prev.text && current.text
      ? `${prev.text}${prev.text.endsWith(" ") || current.text.startsWith(" ") ? "" : " "}${current.text}`
      : prev.text || current.text;
  const next = elements
    .filter((_, i) => i !== index)
    .map((el, i) =>
      el.id === prev.id
        ? { ...el, text: joined, updatedAt: new Date().toISOString(), order: i }
        : { ...el, order: i }
    );
  return { elements: reindexElements(next), focusId: prev.id, caret };
}

export function deleteEmptyElement(
  elements: ScriptElement[],
  index: number
): { elements: ScriptElement[]; focusId: string; caret: number } | null {
  if (elements.length <= 1) return null;
  const current = elements[index];
  if (current.text.trim().length > 0) return null;
  const focusIndex = Math.max(0, index - 1);
  const focus = elements[focusIndex === index ? 1 : focusIndex];
  const next = elements.filter((_, i) => i !== index);
  const focusId = focus.id === current.id ? next[Math.max(0, focusIndex - 1)]?.id : focus.id;
  const target = next.find((e) => e.id === focusId) ?? next[0];
  return {
    elements: reindexElements(next),
    focusId: target.id,
    caret: target.text.length,
  };
}

/** Paste Fountain / multi-line screenplay at index (replaces empty current, else inserts after). */
export function pasteScreenplayAt(
  elements: ScriptElement[],
  index: number,
  clipboard: string
): ScriptElement[] {
  const parsed = fountainToElements(clipboard);
  if (parsed.length === 0) return elements;

  const current = elements[index];
  const replaceCurrent = Boolean(current && !current.text.trim());

  if (elements.length === 1 && replaceCurrent) {
    return reindexElements(parsed);
  }

  const head = elements.slice(0, replaceCurrent ? index : index + 1);
  const tail = elements.slice(replaceCurrent ? index + 1 : index + 1);
  return reindexElements([...head, ...parsed, ...tail]);
}

export function ensureAtLeastOneElement(
  elements: ScriptElement[],
  fallbackType: ScriptElementType = "action"
): ScriptElement[] {
  if (elements.length > 0) return elements;
  return [createScriptElement(fallbackType, "", 0)];
}

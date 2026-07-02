import { ScriptElement, ScriptElementType } from "@/lib/screenplay/types";

/** Approximate lines per US Letter screenplay page at 12pt Courier. */
export const SCREENPLAY_LINES_PER_PAGE = 55;

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function elementLineCount(element: ScriptElement): number {
  const text = element.text.trim();
  if (!text) return 0;

  switch (element.type) {
    case "scene_heading":
      return 2;
    case "character":
      return 1;
    case "parenthetical":
      return 1;
    case "dialogue":
      return Math.max(1, wrapLines(text, 35).length);
    case "action":
      return Math.max(1, wrapLines(text, 60).length);
    case "transition":
      return 2;
    case "shot":
      return Math.max(1, wrapLines(text, 60).length) + 1;
    case "note":
      return Math.max(1, wrapLines(text, 60).length);
    default:
      return 1;
  }
}

export type ScreenplayPage = {
  pageNumber: number;
  elements: ScriptElement[];
};

export function paginateScreenplay(
  elements: ScriptElement[],
  options?: { includeNotes?: boolean }
): ScreenplayPage[] {
  const filtered = elements.filter(
    (element) => options?.includeNotes || element.type !== "note"
  );

  const pages: ScreenplayPage[] = [];
  let current: ScriptElement[] = [];
  let lineCount = 0;
  let pageNumber = 1;

  const flush = () => {
    if (current.length === 0) return;
    pages.push({ pageNumber, elements: current });
    pageNumber += 1;
    current = [];
    lineCount = 0;
  };

  for (const element of filtered) {
    const lines = elementLineCount(element);
    if (lineCount + lines > SCREENPLAY_LINES_PER_PAGE && current.length > 0) {
      flush();
    }
    current.push({ ...element, pageNumber: pages.length + 1 });
    lineCount += lines;
  }

  flush();
  return pages.length > 0 ? pages : [{ pageNumber: 1, elements: [] }];
}

export function screenplayElementClass(type: ScriptElementType): string {
  return `script-element script-${type.replace(/_/g, "-")}`;
}

import { detectElementType } from "@/lib/screenplay/detect";
import {
  assignSceneNumbers,
  createScriptElement,
  reindexElements,
} from "@/lib/screenplay/elements";
import { ScriptElement, ScriptElementType } from "@/lib/screenplay/types";

const SCENE_HEADING =
  /^(INT\.|EXT\.|INT\.\/EXT\.|INT\/EXT\.|EST\.|I\/E\.)\s+.+/i;

function isTransitionLine(line: string): boolean {
  return /^(CUT TO:|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|FADE IN:|FADE OUT\.|FADE TO BLACK\.?)$/i.test(
    line.trim()
  );
}

function isShotLine(line: string): boolean {
  return /^(INSERT(?:\s+-|:)|CLOSE ON:|POV:|ANGLE ON:|WIDE SHOT:|INSERT -)/i.test(line.trim());
}

function isCharacterLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^[A-Z0-9][A-Z0-9 .'\-()]*$/.test(trimmed) &&
    trimmed.length <= 40 &&
    !trimmed.endsWith(":") &&
    !SCENE_HEADING.test(trimmed) &&
    !isTransitionLine(trimmed) &&
    !isShotLine(trimmed)
  );
}

function isParentheticalLine(line: string): boolean {
  return /^\([^)]+\)$/.test(line.trim());
}

function isMetaLine(line: string): boolean {
  return /^(Title:|Author:|Draft:|Contact:|Credit:|Source:)/i.test(line.trim());
}

export function fountainToElements(fountain: string): ScriptElement[] {
  const lines = fountain.replace(/\r\n/g, "\n").split("\n");
  const elements: ScriptElement[] = [];
  let previousType: ScriptElementType | undefined;
  let pendingBlankAfterHeading = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      if (previousType === "scene_heading") {
        pendingBlankAfterHeading = true;
      }
      continue;
    }

    if (isMetaLine(trimmed) || trimmed === "FADE IN:" || trimmed === "THE END") {
      continue;
    }

    let type: ScriptElementType;
    if (SCENE_HEADING.test(trimmed)) {
      type = "scene_heading";
      pendingBlankAfterHeading = false;
    } else if (isTransitionLine(trimmed)) {
      type = "transition";
    } else if (isShotLine(trimmed)) {
      type = "shot";
    } else if (isParentheticalLine(trimmed)) {
      type = "parenthetical";
    } else if (isCharacterLine(trimmed) && previousType !== "dialogue") {
      type = "character";
    } else if (previousType === "character" || previousType === "parenthetical") {
      type = "dialogue";
    } else {
      type = detectElementType(trimmed, previousType);
    }

    if (type === "action" && pendingBlankAfterHeading) {
      pendingBlankAfterHeading = false;
    }

    elements.push(createScriptElement(type, trimmed, elements.length));
    previousType = type;
  }

  return assignSceneNumbers(reindexElements(elements));
}

export function elementsToFountain(elements: ScriptElement[]): string {
  const lines: string[] = [];
  let previousType: ScriptElementType | undefined;

  for (const element of elements) {
    if (element.type === "note") continue;
    const text = element.text.trim();
    if (!text) continue;

    if (element.type === "scene_heading" && lines.length > 0) {
      lines.push("");
    }

    if (element.type === "character" && previousType && previousType !== "action") {
      lines.push("");
    }

    if (element.type === "dialogue" && previousType === "action") {
      lines.push("");
    }

    if (element.type === "parenthetical") {
      lines.push(text.startsWith("(") ? text : `(${text})`);
    } else if (
      element.type === "scene_heading" ||
      element.type === "character" ||
      element.type === "transition" ||
      element.type === "shot"
    ) {
      lines.push(text.toUpperCase());
    } else {
      lines.push(text);
    }

    previousType = element.type;
  }

  return lines.join("\n").trim();
}

export function elementsToPlainText(
  elements: ScriptElement[],
  options?: { includeNotes?: boolean }
): string {
  const includeNotes = options?.includeNotes ?? false;
  const lines: string[] = [];
  let previousType: ScriptElementType | undefined;

  for (const element of elements) {
    if (element.type === "note" && !includeNotes) continue;
    const text = element.text.trim();
    if (!text) continue;

    if (element.type === "transition") {
      lines.push(text.toUpperCase().padStart(60));
    } else if (element.type === "character") {
      lines.push("");
      lines.push(text.toUpperCase().padStart(38));
    } else if (element.type === "parenthetical") {
      lines.push(text.padStart(30));
    } else if (element.type === "dialogue") {
      lines.push(text.padStart(20));
    } else if (element.type === "note") {
      lines.push(`[NOTE] ${text}`);
    } else {
      if (previousType === "scene_heading") lines.push("");
      lines.push(element.type === "scene_heading" || element.type === "shot" ? text.toUpperCase() : text);
    }

    previousType = element.type;
  }

  return lines.join("\n").trim();
}

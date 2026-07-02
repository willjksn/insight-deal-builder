import { ScriptElementType } from "@/lib/screenplay/types";

const SCENE_HEADING =
  /^(INT\.|EXT\.|INT\.\/EXT\.|INT\/EXT\.|EST\.|I\/E\.)\s+.+/i;

const TRANSITION =
  /^(CUT TO:|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|FADE IN:|FADE OUT\.|FADE TO BLACK\.?)$/i;

const SHOT =
  /^(INSERT(?:\s+-|:)|CLOSE ON:|POV:|ANGLE ON:|WIDE SHOT:|INSERT -)/i;

const CHARACTER =
  /^[A-Z0-9][A-Z0-9 .'\-()]*$/;

const PARENTHETICAL = /^\([^)]+\)$/;

export function detectElementType(
  text: string,
  previousType?: ScriptElementType
): ScriptElementType {
  const trimmed = text.trim();
  if (!trimmed) return previousType ?? "action";

  if (SCENE_HEADING.test(trimmed)) return "scene_heading";
  if (TRANSITION.test(trimmed)) return "transition";
  if (SHOT.test(trimmed)) return "shot";
  if (PARENTHETICAL.test(trimmed)) return "parenthetical";

  if (
    CHARACTER.test(trimmed) &&
    trimmed.length <= 40 &&
    !trimmed.endsWith(":") &&
    previousType !== "dialogue"
  ) {
    return "character";
  }

  if (previousType === "character" || previousType === "parenthetical") {
    return "dialogue";
  }

  return "action";
}

export function normalizeElementText(type: ScriptElementType, text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  switch (type) {
    case "scene_heading":
    case "character":
    case "transition":
    case "shot":
      return trimmed.toUpperCase();
    case "parenthetical": {
      const inner = trimmed.replace(/^\(|\)$/g, "").trim();
      return inner ? `(${inner})` : "";
    }
    default:
      return trimmed;
  }
}

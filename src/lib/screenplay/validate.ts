import { ScriptDocument } from "@/lib/scriptWriter/types";
import { getScriptElements } from "@/lib/screenplay/normalize";
import { ScriptElementType } from "@/lib/screenplay/types";

export type ScreenplayValidationIssue = {
  code: string;
  message: string;
  elementId?: string;
};

export type ScreenplayValidationResult = {
  valid: boolean;
  issues: ScreenplayValidationIssue[];
};

const SCENE_HEADING = /^(INT\.|EXT\.|INT\.\/EXT\.|INT\/EXT\.|EST\.|I\/E\.)\s+.+\s-\s.+$/i;

export function validateScreenplay(
  script: ScriptDocument,
  options?: { includeNotes?: boolean }
): ScreenplayValidationResult {
  const issues: ScreenplayValidationIssue[] = [];
  const elements = getScriptElements(script).filter(
    (element) => options?.includeNotes || element.type !== "note"
  );

  if (!script.title?.trim()) {
    issues.push({ code: "missing_title", message: "Script title is required before export." });
  }

  if (elements.length === 0) {
    issues.push({ code: "empty_script", message: "Script has no content to export." });
  }

  let previousType: ScriptElementType | undefined;

  for (const element of elements) {
    const text = element.text.trim();
    if (!text) {
      issues.push({
        code: "empty_block",
        message: "Remove empty screenplay blocks before export.",
        elementId: element.id,
      });
      continue;
    }

    switch (element.type) {
      case "scene_heading":
        if (text !== text.toUpperCase()) {
          issues.push({
            code: "scene_heading_case",
            message: "Scene headings must be ALL CAPS.",
            elementId: element.id,
          });
        }
        if (!SCENE_HEADING.test(text)) {
          issues.push({
            code: "scene_heading_format",
            message: `Scene heading should follow INT./EXT. LOCATION - TIME format: "${text}"`,
            elementId: element.id,
          });
        }
        break;
      case "character":
        if (text !== text.toUpperCase()) {
          issues.push({
            code: "character_case",
            message: "Character names must be ALL CAPS.",
            elementId: element.id,
          });
        }
        break;
      case "dialogue":
        if (previousType !== "character" && previousType !== "parenthetical" && previousType !== "dialogue") {
          issues.push({
            code: "dialogue_order",
            message: "Dialogue should follow a character name.",
            elementId: element.id,
          });
        }
        break;
      case "parenthetical":
        if (!/^\([^)]+\)$/.test(text)) {
          issues.push({
            code: "parenthetical_format",
            message: "Parentheticals must be wrapped in parentheses.",
            elementId: element.id,
          });
        }
        break;
      case "transition":
        if (text !== text.toUpperCase()) {
          issues.push({
            code: "transition_case",
            message: "Transitions must be ALL CAPS.",
            elementId: element.id,
          });
        }
        break;
      default:
        break;
    }

    previousType = element.type;
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

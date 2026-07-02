export type ScriptElementType =
  | "scene_heading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "shot"
  | "note";

export type ScriptElement = {
  id: string;
  type: ScriptElementType;
  text: string;
  sceneNumber?: number;
  pageNumber?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type ScreenplayExportOptions = {
  includeNotes?: boolean;
  showPageOneNumber?: boolean;
  includeTitlePage?: boolean;
};

export const SCRIPT_ELEMENT_TYPES: ScriptElementType[] = [
  "scene_heading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
  "note",
];

export const SCRIPT_ELEMENT_LABELS: Record<ScriptElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
  shot: "Shot",
  note: "Note",
};

export const SCRIPT_ELEMENT_HINTS: Record<ScriptElementType, string> = {
  scene_heading: "Where and when the scene takes place",
  action: "What we see and hear",
  character: "Who is speaking",
  dialogue: "What they say",
  parenthetical: "Short acting direction",
  transition: "How the scene changes",
  shot: "Specific visual or camera moment",
  note: "Production note (hidden from export by default)",
};

export const SCRIPT_ELEMENT_PLACEHOLDERS: Record<ScriptElementType, string> = {
  scene_heading: "INT. WAREHOUSE STUDIO - DAY",
  action: "Elena marks the floor while Marcus checks the monitor feed.",
  character: "ELENA",
  dialogue: "We're ready on this side.",
  parenthetical: "(into coms)",
  transition: "CUT TO:",
  shot: "CLOSE ON: Clapperboard slate",
  note: "Add gaffer tape mark for talent",
};

export const EDITABLE_SCRIPT_ELEMENT_TYPES: ScriptElementType[] = [
  "scene_heading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
  "note",
];

export function nextElementTypeAfterEnter(type: ScriptElementType): ScriptElementType {
  switch (type) {
    case "scene_heading":
      return "action";
    case "action":
      return "action";
    case "character":
      return "dialogue";
    case "dialogue":
      return "action";
    case "parenthetical":
      return "dialogue";
    case "transition":
      return "scene_heading";
    case "shot":
      return "action";
    case "note":
      return "action";
    default:
      return "action";
  }
}

export function cycleElementType(
  type: ScriptElementType,
  direction: "forward" | "backward"
): ScriptElementType {
  const types = EDITABLE_SCRIPT_ELEMENT_TYPES;
  const index = types.indexOf(type);
  if (index < 0) return "action";
  const delta = direction === "forward" ? 1 : -1;
  const next = (index + delta + types.length) % types.length;
  return types[next];
}

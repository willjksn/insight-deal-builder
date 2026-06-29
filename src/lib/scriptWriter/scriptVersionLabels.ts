export type ScriptVersionSource =
  | "generate"
  | "refine"
  | "confirm_analysis"
  | "manual"
  | "restore";

export interface ScriptVersionRecord {
  id: string;
  source: ScriptVersionSource;
  label?: string;
  title?: string;
  createdAt: string;
}

export function scriptVersionLabel(source: ScriptVersionSource, label?: string): string {
  if (label?.trim()) return label.trim();
  switch (source) {
    case "generate":
      return "AI generated";
    case "refine":
      return "AI refinement";
    case "confirm_analysis":
      return "After inspiration confirm";
    case "manual":
      return "Manual edit";
    case "restore":
      return "Restored version";
    default:
      return "Saved version";
  }
}

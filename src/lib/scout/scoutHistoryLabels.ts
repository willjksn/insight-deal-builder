export type ScoutHistoryKind = "shotLists" | "dpPlans" | "analysis";

export type ScoutHistorySource = "ai" | "manual_edit" | "restore";

export interface ScoutHistoryEntry {
  id: string;
  kind: ScoutHistoryKind;
  source?: ScoutHistorySource;
  label?: string;
  createdAt: string;
  summary?: string;
}

export function scoutHistoryLabel(entry: ScoutHistoryEntry): string {
  if (entry.label?.trim()) return entry.label.trim();
  if (entry.source === "manual_edit") return "Manual edit";
  if (entry.source === "restore") return "Restored";
  switch (entry.kind) {
    case "shotLists":
      return "Generated shot list";
    case "dpPlans":
      return "Generated DP plan";
    case "analysis":
      return "Location analysis";
    default:
      return "Saved version";
  }
}

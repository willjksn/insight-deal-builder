/**
 * V8 — Next shoot checklist from Resolve planning feedback + coverage gaps.
 * AI Editor only (does not write into the production board).
 */

import type {
  CoverageReport,
  NextShootChecklist,
  NextShootChecklistItem,
  PlanningFeedback,
} from "@/lib/aiEditor/types";

export function buildNextShootChecklist(input: {
  feedback?: PlanningFeedback | null;
  coverage?: CoverageReport | null;
  /** Preserve check-off state across rebuilds when item ids match. */
  previous?: NextShootChecklist | null;
}): NextShootChecklist {
  const prevDone = new Map(
    (input.previous?.items || []).map((i) => [i.id, i.done] as const)
  );
  const items: NextShootChecklistItem[] = [];
  const seen = new Set<string>();

  const push = (item: Omit<NextShootChecklistItem, "done">) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push({
      ...item,
      done: prevDone.get(item.id) === true,
    });
  };

  const missing = input.coverage?.shots.filter((s) => s.status === "missing") ?? [];
  for (const shot of missing.slice(0, 24)) {
    const label =
      shot.shotName ||
      (shot.scene ? `Scene ${shot.scene}` : null) ||
      shot.plannedShotId;
    push({
      id: `missing_${shot.plannedShotId}`,
      kind: "missing_shot",
      severity: "action",
      label: `Pick up missing coverage: ${label}`,
      plannedShotId: shot.plannedShotId,
    });
  }

  const droppedLabels = input.feedback?.droppedLabels || [];
  const hasDroppedInsight = Boolean(
    input.feedback?.insights.some((i) => i.id === "dropped_in_finish")
  );
  if (hasDroppedInsight && droppedLabels.length) {
    for (const label of droppedLabels.slice(0, 8)) {
      const slug = label.toLowerCase().replace(/[^\w]+/g, "_").slice(0, 40);
      push({
        id: `dropped_${slug}`,
        kind: "dropped_in_finish",
        severity: "suggest",
        label: `Review if you still need: ${label}`,
      });
    }
  }

  for (const insight of input.feedback?.insights || []) {
    if (insight.id === "missing_coverage" && missing.length > 0) continue;
    if (insight.id === "dropped_in_finish" && droppedLabels.length > 0) continue;
    if (insight.id === "baseline") continue;
    if (insight.id === "shorter_in_resolve" || insight.id === "longer_in_resolve") continue;
    if (insight.id === "added_in_resolve") continue;

    if (
      insight.id === "preferred_dropped" ||
      insight.severity === "action" ||
      insight.severity === "suggest"
    ) {
      push({
        id: `insight_${insight.id}`,
        kind:
          insight.id === "preferred_dropped"
            ? "preferred_dropped"
            : insight.id === "dropped_in_finish"
              ? "dropped_in_finish"
              : "insight",
        severity: insight.severity,
        label: insight.text,
      });
    }
  }

  return {
    items: items.slice(0, 40),
    updatedAt: new Date().toISOString(),
    sourceTimelineName: input.feedback?.timelineName,
  };
}

export function toggleChecklistItem(
  checklist: NextShootChecklist,
  itemId: string,
  done?: boolean
): NextShootChecklist {
  return {
    ...checklist,
    updatedAt: new Date().toISOString(),
    items: checklist.items.map((i) =>
      i.id === itemId ? { ...i, done: typeof done === "boolean" ? done : !i.done } : i
    ),
  };
}

export function checklistProgress(checklist?: NextShootChecklist | null): {
  total: number;
  done: number;
  remaining: number;
} {
  const items = checklist?.items || [];
  const doneCount = items.filter((i) => i.done).length;
  return { total: items.length, done: doneCount, remaining: items.length - doneCount };
}

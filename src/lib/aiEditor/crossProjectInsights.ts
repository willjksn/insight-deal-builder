/**
 * V10 — light cross-project patterns from AI Editor settings (no media bytes).
 * Deterministic tallies → plain-language bullets for the AI Editor hub.
 */

import type {
  AiEditorProjectSettings,
  FinishingFeedbackOutcome,
  FinishingMoodId,
} from "@/lib/aiEditor/types";

export type CrossProjectSource = {
  projectId: string;
  projectName: string;
  settings?: AiEditorProjectSettings | null;
};

export type CrossProjectInsight = {
  id: string;
  text: string;
  /** How many projects contributed to this pattern */
  weight: number;
};

export type CrossProjectInsightsSummary = {
  projectCount: number;
  withDataCount: number;
  insights: CrossProjectInsight[];
};

function topEntry<T extends string>(counts: Map<T, number>): { key: T; n: number } | null {
  let best: { key: T; n: number } | null = null;
  for (const [key, n] of counts) {
    if (!best || n > best.n) best = { key, n };
  }
  return best;
}

const MOOD_LABELS: Record<FinishingMoodId, string> = {
  natural: "Natural",
  warm: "Warm",
  cool: "Cool",
  cinematic: "Cinematic",
  high_energy: "High energy",
};

const OUTCOME_LABELS: Record<FinishingFeedbackOutcome, string> = {
  kept_look: "kept the suggested look",
  tweaked_in_resolve: "tweaked the look in Resolve",
  started_fresh: "started fresh in Resolve",
};

export function buildCrossProjectInsights(
  projects: CrossProjectSource[]
): CrossProjectInsightsSummary {
  const moodCounts = new Map<FinishingMoodId, number>();
  const outcomeCounts = new Map<FinishingFeedbackOutcome, number>();
  let missingCoverageProjects = 0;
  let preferredDroppedProjects = 0;
  let droppedInFinishProjects = 0;
  let openChecklistProjects = 0;
  let openChecklistItems = 0;
  let withData = 0;

  for (const p of projects) {
    const s = p.settings;
    if (!s) continue;
    const has =
      Boolean(s.lastFinishingFeedback) ||
      Boolean(s.lastPlanningFeedback) ||
      Boolean(s.nextShootChecklist?.items?.length) ||
      Boolean(s.lastResolveSync);
    if (!has) continue;
    withData += 1;

    const mood = s.lastFinishingFeedback?.moodId;
    if (mood) moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
    const outcome = s.lastFinishingFeedback?.outcome;
    if (outcome) outcomeCounts.set(outcome, (outcomeCounts.get(outcome) || 0) + 1);

    const insightIds = new Set(
      (s.lastPlanningFeedback?.insights || []).map((i) => i.id)
    );
    if (insightIds.has("missing_coverage")) missingCoverageProjects += 1;
    if (insightIds.has("preferred_dropped")) preferredDroppedProjects += 1;
    if (insightIds.has("dropped_in_finish")) droppedInFinishProjects += 1;

    const open = (s.nextShootChecklist?.items || []).filter((i) => !i.done).length;
    if (open > 0) {
      openChecklistProjects += 1;
      openChecklistItems += open;
    }
  }

  const insights: CrossProjectInsight[] = [];
  const push = (id: string, text: string, weight: number) => {
    if (weight < 1) return;
    insights.push({ id, text, weight });
  };

  const topMood = topEntry(moodCounts);
  if (topMood && topMood.n >= 2) {
    push(
      "top_mood",
      `Across ${topMood.n} recent finishes, “${MOOD_LABELS[topMood.key]}” was your most common look.`,
      topMood.n
    );
  }

  const topOutcome = topEntry(outcomeCounts);
  if (topOutcome && topOutcome.n >= 2) {
    push(
      "top_outcome",
      `You usually ${OUTCOME_LABELS[topOutcome.key]} (${topOutcome.n} projects).`,
      topOutcome.n
    );
  }

  if (missingCoverageProjects >= 2) {
    push(
      "missing_coverage",
      `Missing planned coverage showed up on ${missingCoverageProjects} projects — worth locking inserts/reactions before wrap.`,
      missingCoverageProjects
    );
  }

  if (preferredDroppedProjects >= 2) {
    push(
      "preferred_dropped",
      `Preferred takes were cut in finishing on ${preferredDroppedProjects} projects — double-check selects before Resolve.`,
      preferredDroppedProjects
    );
  }

  if (droppedInFinishProjects >= 2) {
    push(
      "dropped_in_finish",
      `Rough-cut clips were dropped in Resolve on ${droppedInFinishProjects} projects — your AI rough cuts may be running long.`,
      droppedInFinishProjects
    );
  }

  if (openChecklistProjects >= 1) {
    push(
      "open_checklist",
      `${openChecklistProjects} project${openChecklistProjects === 1 ? "" : "s"} still ${openChecklistProjects === 1 ? "has" : "have"} open next-shoot items (${openChecklistItems} total).`,
      openChecklistProjects
    );
  }

  if (insights.length === 0 && withData > 0) {
    push(
      "baseline",
      `You’ve synced or finished ${withData} project${withData === 1 ? "" : "s"} — patterns will show once a few share the same look or coverage gaps.`,
      withData
    );
  }

  if (insights.length === 0) {
    push(
      "empty",
      "Finish a cut in Resolve and sync a few projects — patterns across your edits will show up here.",
      0
    );
  }

  return {
    projectCount: projects.length,
    withDataCount: withData,
    insights: insights.slice(0, 6),
  };
}

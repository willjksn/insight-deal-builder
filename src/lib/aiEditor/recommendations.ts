/**
 * V14 — actionable next-step recommendations from AI Editor settings metadata.
 * No media bytes; deterministic; safe to show on the hub.
 */

import type { CrossProjectSource } from "@/lib/aiEditor/crossProjectInsights";
import type { AiEditorProjectSettings } from "@/lib/aiEditor/types";
import { getMoodPreset, getTransitionPreset } from "@/lib/aiEditor/finishing";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationCategory =
  | "checklist"
  | "coverage"
  | "finishing"
  | "storage"
  | "resolve"
  | "pattern";

export type CrossProjectRecommendation = {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  detail: string;
  href?: string;
  projectId?: string;
  projectName?: string;
};

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function projectHref(projectId: string): string {
  return `/projects/${projectId}/ai-editor`;
}

function openChecklistCount(settings?: AiEditorProjectSettings | null): number {
  return (settings?.nextShootChecklist?.items || []).filter((i) => !i.done).length;
}

function hasInsight(settings: AiEditorProjectSettings | null | undefined, id: string): boolean {
  return Boolean(settings?.lastPlanningFeedback?.insights?.some((i) => i.id === id));
}

/** Build ranked, actionable recommendations across the user's edit projects. */
export function buildRecommendations(
  projects: CrossProjectSource[],
  opts?: { limit?: number }
): CrossProjectRecommendation[] {
  const limit = opts?.limit ?? 8;
  const out: CrossProjectRecommendation[] = [];

  const withOpenChecklist = projects
    .map((p) => ({
      ...p,
      open: openChecklistCount(p.settings),
      updatedAt: p.settings?.nextShootChecklist?.updatedAt || "",
    }))
    .filter((p) => p.open > 0)
    .sort(
      (a, b) =>
        b.open - a.open || b.updatedAt.localeCompare(a.updatedAt) || a.projectName.localeCompare(b.projectName)
    );

  for (const p of withOpenChecklist.slice(0, 3)) {
    out.push({
      id: `checklist-${p.projectId}`,
      priority: "high",
      category: "checklist",
      title: `Finish next-shoot items on “${p.projectName}”`,
      detail: `${p.open} open pickup${p.open === 1 ? "" : "s"} still unchecked.`,
      href: projectHref(p.projectId),
      projectId: p.projectId,
      projectName: p.projectName,
    });
  }

  for (const p of withOpenChecklist) {
    const handoffAt = p.settings?.lastBoardHandoffAt;
    const checklistAt = p.settings?.nextShootChecklist?.updatedAt;
    const needsHandoff =
      !handoffAt || (checklistAt && handoffAt && checklistAt > handoffAt);
    if (!needsHandoff) continue;
    out.push({
      id: `board-${p.projectId}`,
      priority: "medium",
      category: "checklist",
      title: `Send pickups to the board for “${p.projectName}”`,
      detail: "Open checklist items can update Production → Filming notes.",
      href: projectHref(p.projectId),
      projectId: p.projectId,
      projectName: p.projectName,
    });
    break;
  }

  const needsChecklist = projects.filter(
    (p) =>
      hasInsight(p.settings, "missing_coverage") &&
      !(p.settings?.nextShootChecklist?.items?.length)
  );
  for (const p of needsChecklist.slice(0, 2)) {
    out.push({
      id: `build-checklist-${p.projectId}`,
      priority: "high",
      category: "coverage",
      title: `Build a next-shoot checklist for “${p.projectName}”`,
      detail: "Missing coverage was flagged after Resolve sync — turn it into pickups.",
      href: projectHref(p.projectId),
      projectId: p.projectId,
      projectName: p.projectName,
    });
  }

  const needsWrapUp = projects.filter(
    (p) => p.settings?.lastResolveSync && !p.settings?.lastFinishingFeedback
  );
  for (const p of needsWrapUp.slice(0, 2)) {
    out.push({
      id: `wrapup-${p.projectId}`,
      priority: "medium",
      category: "finishing",
      title: `Wrap up finishing on “${p.projectName}”`,
      detail: "You synced Resolve — a quick “how did finishing go?” helps seed the next look.",
      href: projectHref(p.projectId),
      projectId: p.projectId,
      projectName: p.projectName,
    });
  }

  const needsBackup = projects.filter(
    (p) =>
      Boolean(p.settings?.projectRootPath?.trim()) &&
      !p.settings?.archiveRootPath?.trim()
  );
  if (needsBackup.length >= 1) {
    const p = needsBackup[0];
    out.push({
      id: `backup-${p.projectId}`,
      priority: needsBackup.length >= 2 ? "medium" : "low",
      category: "storage",
      title:
        needsBackup.length >= 2
          ? `${needsBackup.length} edits have no backup folder`
          : `Add a backup folder for “${p.projectName}”`,
      detail:
        needsBackup.length >= 2
          ? "Set an external HDD backup in Step 2 so you can archive and reclaim later."
          : "Pick an external HDD backup folder in Step 2 (optional but safer).",
      href: projectHref(p.projectId),
      projectId: p.projectId,
      projectName: p.projectName,
    });
  }

  const needsVolumeId = projects.filter(
    (p) =>
      Boolean(p.settings?.projectRootPath?.trim()) &&
      !p.settings?.projectRootVolumeId?.trim()
  );
  if (needsVolumeId.length >= 2) {
    const p = needsVolumeId[0];
    out.push({
      id: `volume-id-${p.projectId}`,
      priority: "low",
      category: "storage",
      title: "Re-save workspaces so drive remount works",
      detail: `${needsVolumeId.length} projects were saved before volume IDs — open Step 2 and Save workspace once.`,
      href: projectHref(p.projectId),
      projectId: p.projectId,
      projectName: p.projectName,
    });
  }

  // Pattern tip from finishing outcomes (non-project-specific)
  let tweakCount = 0;
  let keptCount = 0;
  const moodCounts = new Map<string, number>();
  for (const p of projects) {
    const fb = p.settings?.lastFinishingFeedback;
    if (!fb) continue;
    if (fb.outcome === "tweaked_in_resolve") tweakCount += 1;
    if (fb.outcome === "kept_look") keptCount += 1;
    moodCounts.set(fb.moodId, (moodCounts.get(fb.moodId) || 0) + 1);
  }
  if (tweakCount >= 2 && tweakCount > keptCount) {
    out.push({
      id: "pattern-tweak",
      priority: "low",
      category: "pattern",
      title: "You often tweak the look in Resolve",
      detail:
        "That’s fine — try locking mood notes in Edit notes before handoff so LOOKS.txt is closer.",
    });
  } else if (keptCount >= 2) {
    let topMood: string | null = null;
    let topN = 0;
    for (const [mood, n] of moodCounts) {
      if (n > topN) {
        topMood = mood;
        topN = n;
      }
    }
    if (topMood && topN >= 2) {
      const mood = getMoodPreset(topMood as Parameters<typeof getMoodPreset>[0]);
      const transition = getTransitionPreset("cuts");
      out.push({
        id: "pattern-kept",
        priority: "low",
        category: "pattern",
        title: `Your finishing look usually sticks`,
        detail: `“${mood.label} · ${transition.label}” was kept on ${topN} projects — new edits can start there.`,
      });
    }
  }

  out.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      a.title.localeCompare(b.title)
  );

  // Dedupe by id
  const seen = new Set<string>();
  const unique: CrossProjectRecommendation[] = [];
  for (const r of out) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }
  return unique.slice(0, limit);
}

/** Single-project tips for the AI Editor project page. */
export function buildProjectRecommendations(
  projectId: string,
  projectName: string,
  settings: AiEditorProjectSettings | null | undefined
): CrossProjectRecommendation[] {
  return buildRecommendations(
    [{ projectId, projectName, settings }],
    { limit: 3 }
  ).filter((r) => r.category !== "pattern" || r.projectId === projectId);
}

/**
 * V11 — plain-language “before Resolve / Mac” tips from existing project metadata.
 */

import type {
  AiEditorProjectSettings,
  FinishingPlan,
  NextShootChecklist,
  PlanningFeedback,
  Timeline,
} from "@/lib/aiEditor/types";
import { checklistProgress } from "@/lib/aiEditor/nextShootChecklist";

export type ResolvePreflightTip = {
  id: string;
  text: string;
  level: "ready" | "tip" | "action";
};

export function buildResolvePreflightTips(input: {
  timeline?: Timeline | null;
  finishing?: FinishingPlan | null;
  settings?: AiEditorProjectSettings | null;
  planning?: PlanningFeedback | null;
  checklist?: NextShootChecklist | null;
}): ResolvePreflightTip[] {
  const tips: ResolvePreflightTip[] = [];
  const finishing = input.finishing || input.timeline?.finishing;
  const checklist = input.checklist || input.settings?.nextShootChecklist;
  const planning = input.planning || input.settings?.lastPlanningFeedback;
  const notes = input.settings?.editNotes || [];

  if (!input.timeline) {
    tips.push({
      id: "need_cut",
      level: "action",
      text: "Build a rough cut before sending this edit to Resolve.",
    });
    return tips;
  }

  if (!finishing) {
    tips.push({
      id: "save_look",
      level: "tip",
      text: "Save a look above so Resolve gets mood notes in your project folder.",
    });
  } else {
    tips.push({
      id: "look_ready",
      level: "ready",
      text: `Look ready: ${finishing.moodLabel} · ${finishing.transitionLabel}.`,
    });
  }

  const lookNotes = notes.filter((n) => n.source === "look" || n.source === "client");
  if (lookNotes.length) {
    tips.push({
      id: "notes_in_brief",
      level: "ready",
      text: `${lookNotes.length} look/client note${lookNotes.length === 1 ? "" : "s"} will travel with the Resolve package.`,
    });
  }

  const progress = checklist ? checklistProgress(checklist) : null;
  if (progress && progress.remaining > 0) {
    tips.push({
      id: "open_checklist",
      level: "action",
      text: `${progress.remaining} next-shoot item${progress.remaining === 1 ? "" : "s"} still open — pickups before wrap if you can.`,
    });
  }

  const preferredDropped = planning?.insights?.find((i) => i.id === "preferred_dropped");
  if (preferredDropped) {
    tips.push({
      id: "preferred_dropped",
      level: "tip",
      text: preferredDropped.text,
    });
  } else {
    const dropped = planning?.insights?.find((i) => i.id === "dropped_in_finish");
    if (dropped) {
      tips.push({
        id: "dropped_in_finish",
        level: "tip",
        text: dropped.text,
      });
    }
  }

  return tips.slice(0, 5);
}

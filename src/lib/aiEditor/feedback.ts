/**
 * V3 — feedback loop: what happened in Resolve informs the next edit.
 * Suggestions only — never reads camera media from Resolve.
 */

import type {
  FinishingMoodId,
  FinishingFeedback,
  FinishingFeedbackOutcome,
  TransitionStyleId,
} from "@/lib/aiEditor/types";
import { getMoodPreset, getTransitionPreset } from "@/lib/aiEditor/finishing";

export type FeedbackOutcomeOption = {
  id: FinishingFeedbackOutcome;
  label: string;
  blurb: string;
};

export const FEEDBACK_OUTCOMES: FeedbackOutcomeOption[] = [
  {
    id: "kept_look",
    label: "Kept our look",
    blurb: "The suggestions were close — use them again next time.",
  },
  {
    id: "tweaked_in_resolve",
    label: "Tweaked in Resolve",
    blurb: "Started from our look, then you adjusted color or cuts.",
  },
  {
    id: "started_fresh",
    label: "Started fresh",
    blurb: "You ignored the suggestions — don’t push them as hard next time.",
  },
];

export function buildFinishingFeedback(input: {
  moodId: FinishingMoodId;
  transitionStyle: TransitionStyleId;
  outcome: FinishingFeedbackOutcome;
  note?: string;
}): FinishingFeedback {
  const mood = getMoodPreset(input.moodId);
  const transition = getTransitionPreset(input.transitionStyle);
  return {
    moodId: mood.id,
    moodLabel: mood.label,
    transitionStyle: transition.id,
    transitionLabel: transition.label,
    outcome: input.outcome,
    note: input.note?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
}

/** Defaults for the Look step from the last wrap-up. */
export function defaultsFromFeedback(feedback?: FinishingFeedback | null): {
  moodId: FinishingMoodId;
  transitionStyle: TransitionStyleId;
  hint: string | null;
} {
  if (!feedback) {
    return { moodId: "natural", transitionStyle: "cuts", hint: null };
  }

  if (feedback.outcome === "started_fresh") {
    return {
      moodId: "natural",
      transitionStyle: "cuts",
      hint: "Last time you started fresh in Resolve — defaults are reset to Natural / Hard cuts.",
    };
  }

  return {
    moodId: feedback.moodId,
    transitionStyle: feedback.transitionStyle,
    hint:
      feedback.outcome === "kept_look"
        ? `Remembering “${feedback.moodLabel} · ${feedback.transitionLabel}” from last time.`
        : `Starting from “${feedback.moodLabel} · ${feedback.transitionLabel}” — you tweaked in Resolve last time.`,
  };
}

/**
 * V11 — project wrap-up wins; otherwise soft cross-project pattern defaults.
 */
export function defaultsForLookStep(input: {
  feedback?: FinishingFeedback | null;
  crossProject?: {
    moodId: FinishingMoodId;
    transitionStyle: TransitionStyleId;
    hint: string;
  } | null;
}): {
  moodId: FinishingMoodId;
  transitionStyle: TransitionStyleId;
  hint: string | null;
} {
  if (input.feedback) return defaultsFromFeedback(input.feedback);
  if (input.crossProject) {
    return {
      moodId: input.crossProject.moodId,
      transitionStyle: input.crossProject.transitionStyle,
      hint: input.crossProject.hint,
    };
  }
  return defaultsFromFeedback(null);
}

export function summarizeFeedback(feedback?: FinishingFeedback | null): string | null {
  if (!feedback) return null;
  const outcome =
    FEEDBACK_OUTCOMES.find((o) => o.id === feedback.outcome)?.label || feedback.outcome;
  return `${outcome} · ${feedback.moodLabel} · ${feedback.transitionLabel}`;
}

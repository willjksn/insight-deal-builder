/**
 * Display step numbers for AI Editor cards.
 * Logical step ids stay stable (DOM anchors ai-step-*); badges renumber when steps are hidden.
 */

export type AiEditorLogicalStep =
  | "connect"
  | "footage"
  | "prepare"
  | "analyze"
  | "match"
  | "rough_cut"
  | "chat"
  | "look"
  | "resolve"
  | "archive"
  | "wrap_up";

/** Original DOM suffix: ai-step-{n} — keep these for anchors / deep links. */
export const LOGICAL_STEP_ANCHOR_N: Record<AiEditorLogicalStep, number> = {
  connect: 1,
  footage: 2,
  prepare: 4,
  analyze: 5,
  match: 6,
  rough_cut: 7,
  chat: 8,
  look: 9,
  resolve: 10,
  archive: 11,
  wrap_up: 12,
};

export type VisibleStepsOptions = {
  /** Show prepare card (previews still needed). */
  showPrepare: boolean;
  /** Show analyze + match (linked production / shot list). */
  showPlanSteps: boolean;
};

/** Ordered logical steps currently shown in the UI. */
export function listVisibleLogicalSteps(
  opts: VisibleStepsOptions
): AiEditorLogicalStep[] {
  const steps: AiEditorLogicalStep[] = ["connect", "footage"];
  if (opts.showPrepare) steps.push("prepare");
  if (opts.showPlanSteps) {
    steps.push("analyze", "match");
  }
  steps.push("rough_cut", "chat", "look", "resolve", "archive", "wrap_up");
  return steps;
}

/** Map logical step → 1-based badge number for the current visibility. */
export function buildDisplayStepNumbers(
  opts: VisibleStepsOptions
): Record<AiEditorLogicalStep, number> {
  const order = listVisibleLogicalSteps(opts);
  const map = {} as Record<AiEditorLogicalStep, number>;
  order.forEach((id, i) => {
    map[id] = i + 1;
  });
  return map;
}

export function displayStepNumber(
  logical: AiEditorLogicalStep,
  opts: VisibleStepsOptions
): number {
  return buildDisplayStepNumbers(opts)[logical];
}

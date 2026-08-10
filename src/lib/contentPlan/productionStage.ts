import type {
  ContentPlan,
  ContentPlanProductionStage,
  ContentShot,
} from "@/lib/contentPlan/types";
import { CONTENT_PLAN_PRODUCTION_STAGES } from "@/lib/contentPlan/types";

export function normalizeProductionStage(
  value: unknown
): ContentPlanProductionStage {
  const allowed = new Set(CONTENT_PLAN_PRODUCTION_STAGES.map((s) => s.value));
  if (typeof value === "string" && allowed.has(value as ContentPlanProductionStage)) {
    return value as ContentPlanProductionStage;
  }
  return "planning";
}

export function productionStageLabel(stage?: ContentPlanProductionStage | null): string {
  const key = normalizeProductionStage(stage);
  return (
    CONTENT_PLAN_PRODUCTION_STAGES.find((s) => s.value === key)?.label || "Planning"
  );
}

export function countCompletedShots(shots: ContentShot[] | undefined): {
  done: number;
  total: number;
} {
  const list = shots || [];
  const done = list.filter((s) => s.status === "completed").length;
  return { done, total: list.length };
}

/** True when every shot is completed (and there is at least one). */
export function allShotsCompleted(plan: Pick<ContentPlan, "shots">): boolean {
  const { done, total } = countCompletedShots(plan.shots);
  return total > 0 && done === total;
}

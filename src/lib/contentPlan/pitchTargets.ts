import type { PackageDeliverable } from "@/lib/types";
import type {
  ContentPlanPitchIdea,
  PitchDeliverableTarget,
} from "@/lib/contentPlan/pitchTypes";
import { PITCH_BATCH_CAP } from "@/lib/contentPlan/pitchTypes";

/** Remaining slots per deliverable (package qty − ideas already generated for that name). */
export function remainingPitchTargets(
  deliverables: PackageDeliverable[],
  existingIdeas: ContentPlanPitchIdea[] = []
): PitchDeliverableTarget[] {
  const counts = new Map<string, number>();
  for (const idea of existingIdeas) {
    const key = idea.deliverableName.trim() || "Content";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const targets: PitchDeliverableTarget[] = [];
  for (const d of deliverables) {
    const name = (d.name || "").trim() || "Content";
    const want = Math.max(0, Math.floor(Number(d.quantity) || 0));
    if (want <= 0) continue;
    const have = counts.get(name) || 0;
    const remaining = Math.max(0, want - have);
    if (remaining > 0) targets.push({ deliverableName: name, count: remaining });
  }
  return targets;
}

/** Cap a target list to at most `cap` ideas total (preserve order). */
export function capPitchTargets(
  targets: PitchDeliverableTarget[],
  cap: number = PITCH_BATCH_CAP
): PitchDeliverableTarget[] {
  let left = Math.max(0, cap);
  const out: PitchDeliverableTarget[] = [];
  for (const t of targets) {
    if (left <= 0) break;
    const take = Math.min(t.count, left);
    if (take > 0) {
      out.push({ deliverableName: t.deliverableName, count: take });
      left -= take;
    }
  }
  return out;
}

export function totalTargetCount(targets: PitchDeliverableTarget[]): number {
  return targets.reduce((n, t) => n + t.count, 0);
}

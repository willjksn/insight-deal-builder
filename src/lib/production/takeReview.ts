import type { TakeGroup } from "@/lib/production/ingestTypes";
import type { ProductionDayShot, ProductionShotMedia, ShotReviewState, ShotTakeReview, TakeDecision } from "@/lib/production/types";
import { capturedTakes } from "@/lib/production/capturedFootage";

export const PICKUP_REASON_OPTIONS = [
  "Focus",
  "Performance",
  "Audio",
  "Framing",
  "Continuity",
  "Missing coverage",
  "Camera movement",
  "Other",
] as const;

export interface ReviewAngle {
  clipId: string;
  label: string;
  take: ProductionShotMedia;
  offsetSeconds?: number;
}

export interface ReviewUnit {
  id: string;
  source: "clip" | "group";
  label: string;
  angles: ReviewAngle[];
  audioChoices: { clipId: string; label: string }[];
}

export function reviewUnits(shot: ProductionDayShot, groups: TakeGroup[] = []): ReviewUnit[] {
  const takes = capturedTakes(shot);
  const byClip = new Map(takes.map((take) => [take.metadata?.ingestClipId || take.id, take]));
  const used = new Set<string>();
  const units: ReviewUnit[] = [];
  for (const group of groups) {
    if (group.state !== "confirmed") continue;
    const onShot = group.productionShotId === shot.id || group.members.some((member) => byClip.has(member.clipId));
    if (!onShot) continue;
    const angles: ReviewAngle[] = [];
    for (const member of group.members) {
      const take = byClip.get(member.clipId);
      if (!take) continue;
      used.add(take.id);
      angles.push({
        clipId: member.clipId,
        label: angleLabel(take),
        take,
        offsetSeconds: member.offsetSeconds,
      });
    }
    if (!angles.length) continue;
    units.push({
      id: group.id,
      source: "group",
      label: group.takeNumber ? `Take ${group.takeNumber}` : "Take group",
      angles,
      audioChoices: angles.map((angle) => ({ clipId: angle.clipId, label: angle.label })),
    });
  }
  for (const take of takes) {
    if (used.has(take.id)) continue;
    units.push({
      id: take.id,
      source: "clip",
      label: take.fileName || take.label || "Clip",
      angles: [{ clipId: take.metadata?.ingestClipId || take.id, label: angleLabel(take), take }],
      audioChoices: [],
    });
  }
  return units;
}

function angleLabel(take: ProductionShotMedia): string {
  return [take.camera, take.fileName || take.label].filter(Boolean).join(" — ") || "Clip";
}

export function decisionFor(shot: ProductionDayShot, id: string): ShotTakeReview | undefined {
  return (shot.takeReviews ?? []).find((review) => review.id === id);
}

export function shotIsReviewed(shot: ProductionDayShot, groups: TakeGroup[] = []): boolean {
  const units = reviewUnits(shot, groups);
  if (!units.length) return false;
  return units.every((unit) => {
    const decision = decisionFor(shot, unit.id)?.decision;
    return decision === "best" || decision === "alternate" || decision === "reject";
  });
}

export function setTakeDecision(shot: ProductionDayShot, id: string, source: ShotTakeReview["source"], decision: TakeDecision, now = new Date().toISOString()): ProductionDayShot {
  const current = shot.takeReviews ?? [];
  const next = current.filter((review) => review.id !== id).map((review) => ({ ...review }));
  if (decision === "best") {
    for (const review of next) {
      if (review.decision === "best") review.decision = "alternate";
    }
  }
  const previous = current.find((review) => review.id === id);
  next.push({
    id,
    source,
    decision,
    rating: previous?.rating,
    note: previous?.note,
    preferredVideoClipId: previous?.preferredVideoClipId,
    preferredAudioClipId: previous?.preferredAudioClipId,
    reviewedAt: decision === "unreviewed" ? previous?.reviewedAt : previous?.reviewedAt || now,
    updatedAt: now,
  });
  return withReviewState({ ...shot, takeReviews: next });
}

export function patchTakeReview(shot: ProductionDayShot, id: string, source: ShotTakeReview["source"], patch: Partial<ShotTakeReview>, now = new Date().toISOString()): ProductionDayShot {
  const current = decisionFor(shot, id) ?? { id, source, decision: "unreviewed" as TakeDecision, updatedAt: now };
  const others = (shot.takeReviews ?? []).filter((review) => review.id !== id);
  return withReviewState({ ...shot, takeReviews: [...others, { ...current, ...patch, id, source, updatedAt: now }] });
}

export function reviewStateFor(shot: ProductionDayShot, groups: TakeGroup[] = []): ShotReviewState {
  if (shot.reviewState === "needs_pickup") return "needs_pickup";
  const units = reviewUnits(shot, groups);
  if (units.length && shotIsReviewed(shot, groups)) return "reviewed";
  const started = (shot.takeReviews ?? []).some((review) => review.decision !== "unreviewed" || review.rating || review.note);
  return started ? "in_review" : "unreviewed";
}

function withReviewState(shot: ProductionDayShot, groups: TakeGroup[] = []): ProductionDayShot {
  if (shot.reviewState === "needs_pickup") return shot;
  return { ...shot, reviewState: reviewStateFor({ ...shot, reviewState: undefined }, groups) };
}

export function markNeedsPickup(shot: ProductionDayShot, pickupReason?: string): ProductionDayShot {
  return { ...shot, reviewState: "needs_pickup", pickupReason: pickupReason ?? shot.pickupReason };
}

export function nextShotId(shots: ProductionDayShot[], currentId: string, mode: "previous" | "next" | "unreviewed", groups: TakeGroup[] = []): string | null {
  const ordered = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex((shot) => shot.id === currentId);
  if (index < 0) return null;
  if (mode === "previous") return ordered[index - 1]?.id ?? null;
  if (mode === "next") return ordered[index + 1]?.id ?? null;
  const open = (shot: ProductionDayShot) => reviewStateFor(shot, groups) !== "reviewed";
  for (let i = index + 1; i < ordered.length; i++) {
    if (open(ordered[i])) return ordered[i].id;
  }
  for (let i = 0; i < index; i++) {
    if (open(ordered[i])) return ordered[i].id;
  }
  return null;
}

export type SelectFilter = "best" | "alternate" | "rejected" | "pickup" | "unreviewed";

export function matchesSelect(shot: ProductionDayShot, filter: SelectFilter, groups: TakeGroup[] = []): boolean {
  const decisions = (shot.takeReviews ?? []).map((review) => review.decision);
  if (filter === "best") return decisions.includes("best");
  if (filter === "alternate") return decisions.includes("alternate");
  if (filter === "rejected") return decisions.includes("reject");
  if (filter === "pickup") return reviewStateFor(shot, groups) === "needs_pickup" || shot.productionStatus === "needs_pickup";
  return reviewStateFor(shot, groups) === "unreviewed";
}

export function reviewSummary(shots: ProductionDayShot[], groups: TakeGroup[] = []) {
  return {
    planned: shots.length,
    reviewed: shots.filter((shot) => reviewStateFor(shot, groups) === "reviewed").length,
    best: shots.filter((shot) => matchesSelect(shot, "best", groups)).length,
    pickup: shots.filter((shot) => matchesSelect(shot, "pickup", groups)).length,
    unreviewed: shots.filter((shot) => matchesSelect(shot, "unreviewed", groups)).length,
  };
}

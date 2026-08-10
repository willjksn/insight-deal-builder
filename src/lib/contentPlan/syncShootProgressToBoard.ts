import type { ContentShot } from "@/lib/contentPlan/types";
import type { ProductionDay, ProductionDayShot } from "@/lib/production/types";

export const SHOOT_MODE_NOTE_MARKER = "— Shoot Mode —";

/** Build a replaceable Shoot Mode note block for a board shot. */
export function buildShootProgressNote(shot: ContentShot): string | undefined {
  const parts: string[] = [];
  if (shot.takesCompleted?.length) {
    const takes = [...shot.takesCompleted].sort((a, b) => a - b);
    parts.push(`Takes: ${takes.join(", ")}`);
  }
  const notes = shot.shootNotes?.trim();
  if (notes) parts.push(notes);
  if (!parts.length) return undefined;
  return `${SHOOT_MODE_NOTE_MARKER}\n${parts.join("\n")}`;
}

/** Replace prior Shoot Mode block; keep other board notes. */
export function mergeShootProgressNotes(
  existing: string | undefined,
  shootBlock: string | undefined
): string | undefined {
  if (!shootBlock) return existing?.trim() || undefined;
  const stripped = (existing || "")
    .replace(new RegExp(`\\n*${escapeRegExp(SHOOT_MODE_NOTE_MARKER)}[\\s\\S]*$`), "")
    .trimEnd();
  return stripped ? `${stripped}\n\n${shootBlock}` : shootBlock;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findContentShotForBoard(
  boardShot: ProductionDayShot,
  byId: Map<string, ContentShot>,
  byNumber: Map<number, ContentShot>
): ContentShot | undefined {
  const id = boardShot.contentPlanShotId?.trim();
  if (id && byId.has(id)) return byId.get(id);
  if (boardShot.scoutShotNumber != null) {
    return byNumber.get(boardShot.scoutShotNumber);
  }
  return undefined;
}

/**
 * Overlay Shoot Mode completion onto board day shots.
 * - Matches by contentPlanShotId, then scoutShotNumber === ContentShot.shotNumber
 * - Sets done=true when ContentShot.status is completed (never unsets)
 * - Merges takes / shootNotes into notes under a replaceable marker
 */
export function applyContentPlanShootProgressToDays(
  days: ProductionDay[],
  contentShots: ContentShot[]
): { days: ProductionDay[]; updatedCount: number } {
  const byId = new Map<string, ContentShot>();
  const byNumber = new Map<number, ContentShot>();
  for (const s of contentShots) {
    if (s.id) byId.set(s.id, s);
    if (typeof s.shotNumber === "number") byNumber.set(s.shotNumber, s);
  }

  let updatedCount = 0;
  const nextDays = days.map((day) => {
    const shots = (day.shots ?? []).map((boardShot) => {
      const planShot = findContentShotForBoard(boardShot, byId, byNumber);
      if (!planShot) return boardShot;

      let changed = false;
      let next: ProductionDayShot = boardShot;

      if (planShot.status === "completed" && !boardShot.done) {
        next = { ...next, done: true };
        changed = true;
      }

      if (!next.contentPlanShotId?.trim() && planShot.id) {
        next = { ...next, contentPlanShotId: planShot.id };
        changed = true;
      }

      const shootBlock = buildShootProgressNote(planShot);
      if (shootBlock) {
        const merged = mergeShootProgressNotes(next.notes, shootBlock);
        if (merged !== (next.notes || undefined)) {
          next = { ...next, notes: merged };
          changed = true;
        }
      }

      if (changed) updatedCount += 1;
      return next;
    });
    return { ...day, shots };
  });

  return { days: nextDays, updatedCount };
}

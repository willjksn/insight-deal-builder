import type { ContentShot } from "@/lib/contentPlan/types";
import type { ProductionDay, ProductionDayShot } from "@/lib/production/types";

export const SHOOT_MODE_NOTE_MARKER = "— Shoot Mode —";

export type ParsedShootProgressNotes = {
  takes: number[];
  shootNotes: string | undefined;
  /** Board notes outside the Shoot Mode block. */
  otherNotes: string | undefined;
  hasShootModeBlock: boolean;
};

/** Split board `notes` into Shoot Mode takes/notes vs other DP notes. */
export function parseShootProgressFromNotes(
  notes?: string | null
): ParsedShootProgressNotes {
  const raw = notes?.trim() || "";
  if (!raw) {
    return {
      takes: [],
      shootNotes: undefined,
      otherNotes: undefined,
      hasShootModeBlock: false,
    };
  }
  const idx = raw.indexOf(SHOOT_MODE_NOTE_MARKER);
  if (idx < 0) {
    return {
      takes: [],
      shootNotes: undefined,
      otherNotes: raw,
      hasShootModeBlock: false,
    };
  }
  const otherNotes = raw.slice(0, idx).trim() || undefined;
  const block = raw.slice(idx + SHOOT_MODE_NOTE_MARKER.length).trim();
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let takes: number[] = [];
  const noteLines: string[] = [];
  for (const line of lines) {
    const m = line.match(/^Takes:\s*(.+)$/i);
    if (m?.[1]) {
      takes = m[1]
        .split(/[,]+/)
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !Number.isNaN(n));
    } else {
      noteLines.push(line);
    }
  }
  return {
    takes,
    shootNotes: noteLines.join("\n") || undefined,
    otherNotes,
    hasShootModeBlock: true,
  };
}

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

function takesEqual(a?: number[], b?: number[]): boolean {
  const as = [...(a ?? [])].sort((x, y) => x - y);
  const bs = [...(b ?? [])].sort((x, y) => x - y);
  if (as.length !== bs.length) return false;
  return as.every((n, i) => n === bs[i]);
}

function findBoardShotsForContent(
  contentShot: ContentShot,
  days: ProductionDay[]
): ProductionDayShot[] {
  const hits: ProductionDayShot[] = [];
  for (const day of days) {
    for (const boardShot of day.shots ?? []) {
      const byId =
        Boolean(contentShot.id) &&
        boardShot.contentPlanShotId?.trim() === contentShot.id;
      const byNumber =
        !boardShot.contentPlanShotId?.trim() &&
        boardShot.scoutShotNumber != null &&
        boardShot.scoutShotNumber === contentShot.shotNumber;
      if (byId || byNumber) hits.push(boardShot);
    }
  }
  return hits;
}

/**
 * Pull Shoot Mode takes/notes/done from the production board onto Content Plan shots.
 * - Matches by contentPlanShotId, then scoutShotNumber === ContentShot.shotNumber
 * - Replaces takes/shootNotes when a Shoot Mode block exists on the board
 * - Sets status completed when board.done (never unsets completed / dropped)
 */
export function applyBoardShootProgressToContentShots(
  days: ProductionDay[],
  contentShots: ContentShot[]
): { shots: ContentShot[]; updatedCount: number } {
  let updatedCount = 0;
  const shots = contentShots.map((planShot) => {
    const boardHits = findBoardShotsForContent(planShot, days);
    if (!boardHits.length) return planShot;

    let next = planShot;
    let changed = false;

    const takeSet = new Set<number>();
    let shootNotes: string | undefined;
    let sawBlock = false;
    let anyDone = false;

    for (const boardShot of boardHits) {
      if (boardShot.done) anyDone = true;
      const parsed = parseShootProgressFromNotes(boardShot.notes);
      if (!parsed.hasShootModeBlock) continue;
      sawBlock = true;
      for (const t of parsed.takes) takeSet.add(t);
      if (parsed.shootNotes?.trim()) {
        // Prefer the longest freeform note when multiple board rows match.
        if (!shootNotes || parsed.shootNotes.trim().length > shootNotes.length) {
          shootNotes = parsed.shootNotes.trim();
        }
      }
    }

    if (sawBlock) {
      const takes = [...takeSet].sort((a, b) => a - b);
      if (!takesEqual(next.takesCompleted, takes)) {
        next = { ...next, takesCompleted: takes.length ? takes : undefined };
        changed = true;
      }
      const noteVal = shootNotes || undefined;
      if ((next.shootNotes?.trim() || undefined) !== noteVal) {
        next = { ...next, shootNotes: noteVal };
        changed = true;
      }
    }

    if (
      anyDone &&
      next.status !== "completed" &&
      next.status !== "dropped"
    ) {
      next = { ...next, status: "completed" };
      changed = true;
    }

    if (changed) updatedCount += 1;
    return next;
  });

  return { shots, updatedCount };
}

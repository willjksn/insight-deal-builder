import { parseShootProgressFromNotes } from "@/lib/contentPlan/syncShootProgressToBoard";
import { cn } from "@/lib/utils/cn";

/** Compact Shoot Mode takes / notes (from board `notes` or structured fields). */
export function ShootModeShotMeta({
  notes,
  takes,
  shootNotes,
  className,
}: {
  notes?: string | null;
  takes?: number[];
  shootNotes?: string;
  className?: string;
}) {
  const parsed = parseShootProgressFromNotes(notes);
  const takeList = takes?.length ? takes : parsed.takes;
  const noteText = shootNotes?.trim() || parsed.shootNotes;
  if (!takeList.length && !noteText) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200/80 bg-amber-50/70 px-2 py-1.5 text-xs text-amber-950",
        className
      )}
    >
      <p className="font-medium text-amber-900/90">From Shoot Mode</p>
      {takeList.length ? (
        <p className="mt-0.5 tabular-nums">Takes: {takeList.join(", ")}</p>
      ) : null}
      {noteText ? (
        <p className="mt-0.5 whitespace-pre-wrap text-amber-950/90">{noteText}</p>
      ) : null}
    </div>
  );
}

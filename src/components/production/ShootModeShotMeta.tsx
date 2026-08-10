import { parseShootProgressFromNotes } from "@/lib/contentPlan/syncShootProgressToBoard";
import { cn } from "@/lib/utils/cn";

/** Compact Shoot Mode takes / notes under a board shot (from synced `notes`). */
export function ShootModeShotMeta({
  notes,
  className,
}: {
  notes?: string | null;
  className?: string;
}) {
  const parsed = parseShootProgressFromNotes(notes);
  if (!parsed.hasShootModeBlock && !parsed.takes.length && !parsed.shootNotes) {
    return null;
  }
  if (!parsed.takes.length && !parsed.shootNotes) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200/80 bg-amber-50/70 px-2 py-1.5 text-xs text-amber-950",
        className
      )}
    >
      <p className="font-medium text-amber-900/90">From Shoot Mode</p>
      {parsed.takes.length ? (
        <p className="mt-0.5 tabular-nums">
          Takes: {parsed.takes.join(", ")}
        </p>
      ) : null}
      {parsed.shootNotes ? (
        <p className="mt-0.5 whitespace-pre-wrap text-amber-950/90">{parsed.shootNotes}</p>
      ) : null}
    </div>
  );
}

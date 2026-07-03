"use client";

import { cn } from "@/lib/utils/cn";

export function StoryboardModeToggle({
  checked,
  onChange,
  className,
  compact,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2.5",
        !compact && "border-slate-200 bg-white px-4 py-3 shadow-sm",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
      />
      <span className="text-sm">
        <span className="font-medium text-slate-900">Storyboard mode</span>
        {!compact && (
          <span className="mt-0.5 block text-xs text-slate-500">
            One reference frame per scene for grid view and client PDF — matched to your
            inspiration images (ShotDeck, mood refs). Works alongside the detailed shot list.
          </span>
        )}
        {compact && (
          <span className="ml-1 text-xs text-slate-500">
            — scene frames for grid / PDF
          </span>
        )}
      </span>
    </label>
  );
}

export function ShotListOptions({
  storyboardMode,
  onStoryboardChange,
  detailedShotList,
  onDetailedChange,
  compact,
  className,
}: {
  storyboardMode: boolean;
  onStoryboardChange: (value: boolean) => void;
  detailedShotList: boolean;
  onDetailedChange: (value: boolean) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <StoryboardModeToggle
        checked={storyboardMode}
        onChange={onStoryboardChange}
        compact={compact}
      />
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border border-violet-200/80 bg-violet-50/40 px-3 py-2.5",
          !compact && "border-slate-200 bg-white px-4 py-3 shadow-sm"
        )}
      >
        <input
          type="checkbox"
          checked={detailedShotList}
          onChange={(e) => onDetailedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-sm">
          <span className="font-medium text-slate-900">Full detailed shot list</span>
          {!compact && (
            <span className="mt-0.5 block text-xs text-slate-500">
              WS / MS / CU coverage per scene — checklist on the shot list page. Can be combined
              with storyboard mode.
            </span>
          )}
        </span>
      </label>
    </div>
  );
}

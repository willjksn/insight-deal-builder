"use client";

import { cn } from "@/lib/utils/cn";

export function DetailedShotListToggle({
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
        "flex cursor-pointer items-start gap-3 rounded-xl border border-violet-200/80 bg-violet-50/40 px-3 py-2.5",
        !compact && "border-slate-200 bg-white px-4 py-3 shadow-sm",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
      <span className="text-sm">
        <span className="font-medium text-slate-900">Full detailed shot list</span>
        {!compact && (
          <span className="mt-0.5 block text-xs text-slate-500">
            Gemini breaks each scene into wide establishing, medium, close-up, inserts, and reactions —
            then applies to your shot list page with checkboxes.
          </span>
        )}
        {compact && (
          <span className="ml-1 text-xs text-slate-500">
            — WS / MS / CU coverage per scene
          </span>
        )}
      </span>
    </label>
  );
}

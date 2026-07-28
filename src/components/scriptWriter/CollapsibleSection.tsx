"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Lightweight collapsible section with a title toggle. Used to keep long
 * script-writer sections (screenplay, production pack tables, storyboard)
 * compact — especially on mobile.
 */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  action,
  children,
  className,
}: {
  title: string;
  defaultOpen?: boolean;
  /** Optional right-aligned control (e.g. an expand-all button). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-1.5 text-left"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
              !open && "-rotate-90"
            )}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </span>
        </button>
        {action ?? null}
      </div>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

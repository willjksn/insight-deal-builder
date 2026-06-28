"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ReactNode, useState } from "react";

interface ExpandableSectionProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function ExpandableSection({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {summary && !open && (
            <p className="mt-0.5 text-sm text-slate-500 truncate">{summary}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </section>
  );
}

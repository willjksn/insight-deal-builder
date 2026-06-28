"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ReactNode, useState } from "react";

export function BoardColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex min-w-0 flex-col gap-4 lg:gap-6", className)}>{children}</div>;
}

type BoardCardTone = "default" | "muted";

export function BoardCard({
  title,
  children,
  className,
  bodyClassName,
  tone = "default",
  action,
  collapsible = false,
  defaultOpen = true,
  summary,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  tone?: BoardCardTone;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "min-w-0 overflow-clip rounded-2xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-200/40 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-200/50",
        tone === "muted" && "bg-slate-50/90",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-4 py-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {!open && summary ? (
              <span className="min-w-0 truncate text-xs text-slate-500">{summary}</span>
            ) : null}
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
        ) : (
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        )}
        {action ? (
          <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        ) : null}
      </div>
      {(!collapsible || open) && (
        <div className={cn("min-w-0", bodyClassName ?? "px-4 py-4")}>{children}</div>
      )}
    </section>
  );
}

/** Collapsible row inside a card list (Filming, Story, etc.) */
export function BoardListRow({
  icon,
  iconClassName,
  label,
  summary,
  defaultOpen = false,
  children,
  trailing,
}: {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  summary?: string;
  defaultOpen?: boolean;
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expandable = Boolean(children);

  return (
    <li>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            iconClassName ?? "bg-sky-100 text-sky-700"
          )}
        >
          {icon}
        </div>
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-sm font-medium text-slate-900">{label}</span>
            {!open && summary ? (
              <span className="block truncate text-xs text-slate-500">{summary}</span>
            ) : null}
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-900">{label}</span>
            {summary ? (
              <span className="block truncate text-xs text-slate-500">{summary}</span>
            ) : null}
          </div>
        )}
        {trailing}
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-sky-700"
            aria-expanded={open}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
        ) : null}
      </div>
      {expandable && open ? (
        <div className="border-t border-slate-100 bg-sky-50/30 px-3 py-2.5">{children}</div>
      ) : null}
    </li>
  );
}

export function BoardScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-h-[420px] overflow-y-auto pr-0.5 scrollbar-thin", className)}>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScriptSuggestedShot } from "@/lib/scriptWriter/types";
import { shotListDetailRows, shotListTitle } from "@/lib/scriptWriter/shotListDisplay";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { cn } from "@/lib/utils/cn";

export function ScriptShotListCard({
  shot,
  defaultOpen = false,
}: {
  shot: ScriptSuggestedShot;
  defaultOpen?: boolean;
}) {
  const rows = shotListDetailRows(shot);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {shotListTitle(shot)}
          </span>
          {!open ? (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span className="font-medium text-slate-600">
                {formatShotTypeLabel(shot.shotType)}
              </span>
              {shot.sceneNumber ? <span>Scene {shot.sceneNumber}</span> : null}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="px-3 pb-3">
          {rows.length ? (
            <dl className="grid gap-1.5 sm:grid-cols-2">
              {rows.map(({ label, value }) => (
                <div key={label} className="min-w-0 sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-0.5 break-words text-xs leading-relaxed text-slate-700">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-slate-600">{shot.description}</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

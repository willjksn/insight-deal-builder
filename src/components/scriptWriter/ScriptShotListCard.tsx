"use client";

import { ScriptSuggestedShot } from "@/lib/scriptWriter/types";
import { shotListDetailRows, shotListTitle } from "@/lib/scriptWriter/shotListDisplay";

export function ScriptShotListCard({ shot }: { shot: ScriptSuggestedShot }) {
  const rows = shotListDetailRows(shot);

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
      <h5 className="text-sm font-semibold text-slate-900">{shotListTitle(shot)}</h5>
      {rows.length ? (
        <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="min-w-0 sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-0.5 break-words text-xs leading-relaxed text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-xs text-slate-600">{shot.description}</p>
      )}
    </article>
  );
}

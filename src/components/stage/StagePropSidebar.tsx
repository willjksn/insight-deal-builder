"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StagePropIcon } from "@/components/stage/StagePropIcon";
import { searchStageProps } from "@/lib/stage/propCatalog";
import { STAGE_PROP_CATEGORIES, StagePropCategory } from "@/lib/stage/types";
import { cn } from "@/lib/utils/cn";

export function StagePropSidebar({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StagePropCategory | "all">("all");

  const props = useMemo(
    () => searchStageProps(query, category === "all" ? undefined : category),
    [query, category]
  );

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      <div className="border-b border-slate-100 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Props</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lights, flags…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-medium",
              category === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            )}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {STAGE_PROP_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium",
                category === c.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              )}
              onClick={() => setCategory(c.id)}
            >
              {c.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {props.map((prop) => (
          <li key={prop.id}>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-stage-prop", prop.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="mb-1 flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left hover:border-slate-200 hover:bg-slate-50 active:cursor-grabbing"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100">
                <StagePropIcon prop={prop} scale={0.65} />
              </div>
              <span className="text-xs font-medium leading-tight text-slate-800">{prop.name}</span>
            </button>
          </li>
        ))}
        {props.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-slate-400">No props match.</p>
        )}
      </ul>
      <p className="border-t border-slate-100 p-2 text-[10px] text-slate-400">
        Drag onto canvas · Select tool + corner handles to resize
      </p>
    </aside>
  );
}

"use client";

import { Search } from "lucide-react";

export const OPEN_GLOBAL_SEARCH_EVENT = "shootspine:open-search";

/** Opens GlobalSearchDialog via custom event (also bound to Ctrl/Cmd+K). */
export function GlobalSearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new Event(OPEN_GLOBAL_SEARCH_EVENT));
      }}
      className="mr-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
      aria-label="Search"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border border-slate-200 px-1 py-0.5 text-[10px] text-slate-400 md:inline">
        ⌘K
      </kbd>
    </button>
  );
}

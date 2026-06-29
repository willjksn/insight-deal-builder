import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ListSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

/** Compact search for catalog list pages — not full page width. */
export function ListSearchField({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className,
}: ListSearchFieldProps) {
  return (
    <div className={cn("mb-4 max-w-sm", className)}>
      <label htmlFor="list-search" className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="list-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 min-h-[44px]"
        />
      </div>
    </div>
  );
}

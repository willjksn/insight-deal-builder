"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OPEN_GLOBAL_SEARCH_EVENT } from "@/components/layout/GlobalSearchTrigger";

type SearchHit = {
  id: string;
  type: "opportunity" | "contact" | "client";
  title: string;
  subtitle?: string;
  href: string;
};

const TYPE_LABEL: Record<SearchHit["type"], string> = {
  opportunity: "Opportunity",
  contact: "Contact",
  client: "Client",
};

export function GlobalSearchDialog() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !user || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const token = await user.getIdToken();
          const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = (await res.json()) as { results?: SearchHit[]; error?: string };
          if (!res.ok) throw new Error(data.error || "Search failed");
          if (!cancelled) {
            setResults(data.results ?? []);
            setActive(0);
          }
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, query, user]);

  const go = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      router.push(hit.href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Search opportunities, contacts, clients…"
            className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
            Esc
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          ) : null}
          {error ? <p className="px-3 py-4 text-sm text-red-600">{error}</p> : null}
          {!loading && !error && query.trim().length < 2 ? (
            <p className="px-3 py-4 text-sm text-slate-500">Type at least 2 characters.</p>
          ) : null}
          {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">No matches.</p>
          ) : null}
          <ul>
            {results.map((hit, i) => (
              <li key={`${hit.type}-${hit.id}`}>
                <button
                  type="button"
                  onClick={() => go(hit)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full flex-col rounded-xl px-3 py-2 text-left ${
                    i === active ? "bg-sky-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-medium text-slate-900">{hit.title}</span>
                  <span className="text-xs text-slate-500">
                    {TYPE_LABEL[hit.type]}
                    {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

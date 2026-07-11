"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ColorWheelReference } from "@/components/reference/ColorWheelReference";
import { CameraShotReference } from "@/components/reference/CameraShotReference";
import { ProductionSoundSectionExtras } from "@/components/reference/ProductionSoundDiagrams";
import { REFERENCE_CATEGORIES } from "@/lib/reference/categories";
import { DEFAULT_REFERENCE_GUIDE, mergeReferenceSections } from "@/lib/reference/defaultGuide";
import { ReferenceGuideDocument, ReferenceSection } from "@/lib/reference/types";
import { cn } from "@/lib/utils/cn";

function ReferenceTableView({ table }: { table: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[280px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {table.headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-slate-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 align-top last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({ section }: { section: ReferenceSection }) {
  return (
    <article id={section.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
      {section.summary && <p className="mt-1 text-sm text-slate-500">{section.summary}</p>}
      {section.body && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{section.body}</p>
      )}
      {section.tables?.map((table, i) => (
        <ReferenceTableView key={i} table={table} />
      ))}
      {section.tips?.length ? (
        <ul className="mt-3 space-y-1 rounded-lg bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          {section.tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      ) : null}
      {section.id.startsWith("production-sound-") ? (
        <ProductionSoundSectionExtras sectionId={section.id} />
      ) : null}
      {section.id === "color-wheel" ? <ColorWheelReference /> : null}
      {section.id === "camera-shots-visual-reference" ? <CameraShotReference /> : null}
    </article>
  );
}

export function ReferenceGuideView({
  guide,
  loading,
}: {
  guide: ReferenceGuideDocument | null;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const sectionNavRef = useRef<HTMLDivElement>(null);
  const activeNavButtonRef = useRef<HTMLButtonElement>(null);

  const displayGuide = useMemo(
    () => (guide ? mergeReferenceSections(DEFAULT_REFERENCE_GUIDE, guide) : null),
    [guide]
  );

  const filtered = useMemo(() => {
    if (!displayGuide) return [];
    const q = query.trim().toLowerCase();
    return displayGuide.sections.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      const hay = [s.title, s.summary, s.body, ...(s.tips ?? []), ...(s.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [displayGuide, query, category]);

  const activeCategory = useMemo(() => {
    if (!displayGuide || !activeSectionId) return null;
    return displayGuide.sections.find((s) => s.id === activeSectionId)?.category ?? null;
  }, [displayGuide, activeSectionId]);

  useEffect(() => {
    if (filtered.length === 0) {
      setActiveSectionId(null);
      return;
    }
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (hash && filtered.some((s) => s.id === hash)) {
      setActiveSectionId(hash);
      return;
    }
    setActiveSectionId(filtered[0].id);
  }, [filtered]);

  useEffect(() => {
    if (filtered.length === 0) return;

    const ids = filtered.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -60% 0px", threshold: [0, 0.15, 0.35, 0.55] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [filtered]);

  useEffect(() => {
    activeNavButtonRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSectionId]);

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    window.history.replaceState(null, "", `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!displayGuide) return <p className="text-slate-500">Could not load reference guide.</p>;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <nav className="lg:w-52 lg:shrink-0">
        <div className="sticky top-20 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guide…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm outline-none focus:border-sky-400"
            />
          </div>
          <div className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            <button
              type="button"
              className={cn(
                "rounded-lg px-2 py-1.5 text-left text-xs font-medium lg:w-full",
                category === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
              onClick={() => setCategory("all")}
            >
              All sections
            </button>
            {REFERENCE_CATEGORIES.map((c) => {
              const isFilter = category === c.id;
              const isScrollActive = category === "all" && activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-left text-xs font-medium lg:w-full",
                    isFilter
                      ? "bg-slate-900 text-white"
                      : isScrollActive
                        ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={() => {
                    setCategory(c.id);
                    if (query.trim()) setQuery("");
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div
            ref={sectionNavRef}
            className="max-h-[min(40vh,280px)] space-y-0.5 overflow-y-auto border-t border-slate-100 pt-2"
          >
            {filtered.map((section) => {
              const isActive = activeSectionId === section.id;
              return (
                <button
                  key={section.id}
                  ref={isActive ? activeNavButtonRef : undefined}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left text-[11px] leading-snug transition-colors",
                    isActive
                      ? "bg-sky-50 font-semibold text-sky-900 ring-1 ring-sky-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {section.title}
                </button>
              );
            })}
          </div>
          <a
            href="#production-sound-home"
            onClick={(e) => {
              e.preventDefault();
              setCategory("audio");
              setQuery("");
              scrollToSection("production-sound-home");
            }}
            className="block text-xs font-medium text-sky-700 hover:underline"
          >
            Jump to production sound →
          </a>
          <a
            href="#color-wheel"
            onClick={(e) => {
              e.preventDefault();
              setCategory("lighting");
              setQuery("");
              scrollToSection("color-wheel");
            }}
            className="block text-xs font-medium text-sky-700 hover:underline"
          >
            Jump to color wheel →
          </a>
          <a
            href="#screenplay-overview"
            onClick={(e) => {
              e.preventDefault();
              setCategory("screenplay");
              setQuery("");
              scrollToSection("screenplay-overview");
            }}
            className="block text-xs font-medium text-sky-700 hover:underline"
          >
            Jump to scripts & writing →
          </a>
          <a
            href="#quick-matrix"
            onClick={(e) => {
              e.preventDefault();
              setCategory("templates");
              setQuery("");
              scrollToSection("quick-matrix");
            }}
            className="block text-xs font-medium text-sky-700 hover:underline"
          >
            Jump to quick matrix →
          </a>
        </div>
      </nav>

      <div className="min-w-0 flex-1 space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">On-set reference</p>
          <h1 className="mt-1 text-2xl font-bold">{displayGuide.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{displayGuide.subtitle}</p>
          {displayGuide.updatedAt && (
            <p className="mt-2 text-xs text-slate-400">
              Updated {new Date(displayGuide.updatedAt).toLocaleString()}
            </p>
          )}
        </header>

        {filtered.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            {query.trim()
              ? "No sections match your search. Clear the search box or pick another category."
              : "No sections in this category yet."}
          </p>
        )}
      </div>
    </div>
  );
}

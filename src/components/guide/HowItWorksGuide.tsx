"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { InfoCallout } from "@/components/ui/PageSection";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { GUIDE_CATEGORIES } from "@/lib/guide/guideContent";
import {
  filterGuideCategories,
  flatGuideSections,
  guideAudienceLabel,
  isGuideAdminView,
} from "@/lib/guide/access";
import { GuideBlock, GuideCategory } from "@/lib/guide/types";

function GuideBlockView({ block }: { block: GuideBlock }) {
  return (
    <div className="space-y-3">
      {block.heading ? (
        <h4 className="text-sm font-semibold text-slate-800">{block.heading}</h4>
      ) : null}
      {block.paragraphs?.map((p) => (
        <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-slate-600">
          {p}
        </p>
      ))}
      {block.bullets?.length ? (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          {block.bullets.map((b) => (
            <li key={b.slice(0, 48)}>{b}</li>
          ))}
        </ul>
      ) : null}
      {block.tips?.length ? (
        <InfoCallout variant="emerald">
          <div className="flex gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <ul className="space-y-1">
              {block.tips.map((t) => (
                <li key={t.slice(0, 48)}>{t}</li>
              ))}
            </ul>
          </div>
        </InfoCallout>
      ) : null}
      {block.links?.length ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {block.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-50"
            >
              {link.label}
              <ChevronRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TableOfContents({
  categories,
  activeId,
  onSelect,
}: {
  categories: GuideCategory[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-4" aria-label="Guide contents">
      {categories.map((cat) => (
        <div key={cat.id}>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {cat.label}
          </p>
          <ul className="space-y-0.5">
            {cat.sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  className={cn(
                    "w-full rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    activeId === section.id
                      ? "bg-sky-50 font-medium text-sky-900 ring-1 ring-sky-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function HowToUseGuide() {
  const { appUser } = useAuth();
  const categories = useMemo(
    () => filterGuideCategories(GUIDE_CATEGORIES, appUser),
    [appUser]
  );
  const sections = useMemo(() => flatGuideSections(categories), [categories]);
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (sections.length === 0) {
      setActiveId(null);
      return;
    }
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (hash && sections.some((s) => s.id === hash)) {
      setActiveId(hash);
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setActiveId(sections[0].id);
  }, [sections]);

  useEffect(() => {
    if (sections.length === 0) return;

    const ids = sections.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const adminView = isGuideAdminView(appUser);

  return (
    <div className="pb-24">
      <PageHeader
        title="How to use"
        subtitle="Step-by-step instructions with explanations for every part of the app you can access. Sections match your permissions."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={adminView ? "success" : "info"}>{guideAudienceLabel(appUser)}</Badge>
        <span className="text-sm text-slate-500">
          {sections.length} topic{sections.length === 1 ? "" : "s"} for you
        </span>
      </div>

      {adminView ? (
        <InfoCallout variant="sky">
          <p className="text-sm">
            You have admin access — this guide covers every user-facing topic (production,
            catalogs, agreements, reports, and settings). Other team members only see sections
            that match their permission checkboxes.
          </p>
        </InfoCallout>
      ) : (
        <InfoCallout variant="blue">
          <p className="text-sm">
            Missing a topic? Ask an admin to enable the matching permission on your profile, or
            request project access under Settings → Project access.
          </p>
        </InfoCallout>
      )}

      {sections.length === 0 ? (
        <p className="mt-8 text-center text-slate-500">
          No guide topics match your current permissions yet.
        </p>
      ) : (
        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-sky-600" />
                Guide contents
              </div>
              <TableOfContents
                categories={categories}
                activeId={activeId}
                onSelect={scrollToSection}
              />
            </div>
          </aside>

          <div className="space-y-10">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-6">
                <div className="lg:hidden">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {cat.label}
                  </h2>
                </div>
                {cat.sections.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-100"
                  >
                    <header className="mb-5 border-b border-slate-100 pb-4">
                      <p className="mb-1 hidden text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:block">
                        {cat.label}
                      </p>
                      <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                    </header>
                    <div className="space-y-6">
                      {section.blocks.map((block, i) => (
                        <GuideBlockView key={`${section.id}-block-${i}`} block={block} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

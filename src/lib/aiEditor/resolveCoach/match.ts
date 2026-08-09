import { RESOLVE_COACH_SECTIONS } from "@/lib/aiEditor/resolveCoach/guide";
import type {
  ResolveCoachMatch,
  ResolveCoachPage,
  ResolveCoachSection,
} from "@/lib/aiEditor/resolveCoach/types";

const STOP = new Set([
  "a",
  "an",
  "the",
  "to",
  "in",
  "on",
  "of",
  "for",
  "and",
  "or",
  "how",
  "do",
  "i",
  "my",
  "me",
  "can",
  "please",
  "what",
  "where",
  "when",
  "with",
  "from",
  "into",
  "a",
]);

/** Normalize ask text into tokens for local matching (no cloud). */
export function tokenizeCoachQuery(q: string): string[] {
  return String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .split(/[\s/+.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreSection(section: ResolveCoachSection, tokens: string[], raw: string): number {
  if (!tokens.length && !raw.trim()) return 0;
  const title = section.title.toLowerCase();
  const summary = section.summary.toLowerCase();
  const kw = section.keywords.map((k) => k.toLowerCase());
  const hay = `${title} ${summary} ${kw.join(" ")} ${section.page}`;
  let score = 0;

  const q = raw.toLowerCase().trim();
  if (q.length >= 4) {
    for (const phrase of kw) {
      if (phrase.length >= 3 && q.includes(phrase)) score += 12;
    }
    if (title.includes(q)) score += 10;
  }

  for (const t of tokens) {
    if (title.split(/\s+/).includes(t)) score += 5;
    else if (title.includes(t)) score += 3;
    if (section.page === t) score += 4;
    for (const phrase of kw) {
      if (phrase === t) score += 6;
      else if (phrase.includes(t) && t.length >= 3) score += 2;
    }
    if (hay.includes(t)) score += 1;
  }

  // Prefer beginner when scores tie-ish and query looks like a how-to
  if (/\b(how|add|make|where|help)\b/i.test(q) && section.level === "beginner") {
    score += 1;
  }
  return score;
}

/**
 * Local ask → ranked guide sections. No LLM / no network.
 */
export function matchResolveCoachQuery(
  query: string,
  opts?: { page?: ResolveCoachPage | "all"; limit?: number }
): ResolveCoachMatch[] {
  const raw = String(query || "").trim();
  const tokens = tokenizeCoachQuery(raw);
  const page = opts?.page && opts.page !== "all" ? opts.page : null;
  const limit = Math.max(1, Math.min(20, opts?.limit ?? 6));

  const pool = page
    ? RESOLVE_COACH_SECTIONS.filter((s) => s.page === page)
    : RESOLVE_COACH_SECTIONS;

  const ranked = pool
    .map((section) => ({ section, score: scoreSection(section, tokens, raw) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.section.title.localeCompare(b.section.title));

  return ranked.slice(0, limit);
}

/** Browse helper when the ask box is empty. */
export function listResolveCoachSections(page?: ResolveCoachPage | "all"): ResolveCoachSection[] {
  const pool =
    page && page !== "all"
      ? RESOLVE_COACH_SECTIONS.filter((s) => s.page === page)
      : RESOLVE_COACH_SECTIONS;
  const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 } as const;
  return [...pool].sort(
    (a, b) =>
      levelOrder[a.level] - levelOrder[b.level] || a.title.localeCompare(b.title)
  );
}

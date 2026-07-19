import type { TavilySearchResponse, TavilySearchResult } from "@/lib/search/tavilyClient";

/** Merge multiple Tavily responses, dedupe by URL, keep strongest scores. */
export function mergeTavilySearches(
  searches: TavilySearchResponse[],
  combinedQueryLabel: string
): TavilySearchResponse {
  const byUrl = new Map<string, TavilySearchResult>();
  const answers: string[] = [];

  for (const search of searches) {
    if (search.answer?.trim()) {
      answers.push(`[${search.query}] ${search.answer.trim()}`);
    }
    for (const r of search.results) {
      const key = r.url.replace(/\/$/, "").toLowerCase();
      const prev = byUrl.get(key);
      if (!prev || (r.score ?? 0) > (prev.score ?? 0) || r.content.length > prev.content.length) {
        byUrl.set(key, r);
      }
    }
  }

  const results = [...byUrl.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    query: combinedQueryLabel,
    answer: answers.length ? answers.join("\n\n") : undefined,
    results,
  };
}

import { logTavilyUsage } from "@/lib/ai/usageLog";

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type TavilySearchResponse = {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
};

export function tavilyAvailable(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

export async function tavilySearch(
  query: string,
  options?: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeAnswer?: boolean;
  }
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: options?.maxResults ?? 6,
      search_depth: options?.searchDepth ?? "basic",
      include_answer: options?.includeAnswer ?? true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tavily search failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    query?: string;
    answer?: string;
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
    }>;
  };

  logTavilyUsage(options?.searchDepth ?? "basic");

  return {
    query: data.query ?? query,
    answer: data.answer,
    results: (data.results ?? [])
      .filter((r) => r.title && r.url)
      .map((r) => ({
        title: r.title!,
        url: r.url!,
        content: r.content ?? "",
        score: r.score,
      })),
  };
}

export function formatTavilyResultsForPrompt(search: TavilySearchResponse): string {
  const lines = [`Search query: ${search.query}`];
  if (search.answer?.trim()) {
    lines.push("", "Tavily summary:", search.answer.trim());
  }
  if (search.results.length) {
    lines.push("", "Sources:");
    for (const r of search.results) {
      lines.push(`- ${r.title} (${r.url})`);
      if (r.content.trim()) {
        lines.push(`  ${r.content.trim().slice(0, 500)}${r.content.length > 500 ? "…" : ""}`);
      }
    }
  }
  return lines.join("\n");
}

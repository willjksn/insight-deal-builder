import { logTavilyUsage } from "@/lib/ai/usageLog";
import { withAiCallLogging } from "@/lib/ai/aiTelemetry";

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
  return withAiCallLogging(
    { provider: "tavily", op: "search", meta: { depth: options?.searchDepth ?? "basic" } },
    () => tavilySearchInner(query, options)
  );
}

async function tavilySearchInner(
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
    if (res.status === 401) {
      throw new Error(
        "TAVILY_API_KEY is missing or invalid (Tavily returned 401 Unauthorized). " +
          "Set a valid key from tavily.com in server env."
      );
    }
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

export function formatTavilyResultsForPrompt(
  search: TavilySearchResponse,
  options?: { maxSnippetChars?: number; maxResults?: number }
): string {
  const maxSnippet = options?.maxSnippetChars ?? 1400;
  const maxResults = options?.maxResults ?? 24;
  const lines = [`Search query: ${search.query}`];
  if (search.answer?.trim()) {
    lines.push("", "Tavily summary:", search.answer.trim().slice(0, 4000));
  }
  if (search.results.length) {
    lines.push("", "Sources:");
    for (const r of search.results.slice(0, maxResults)) {
      lines.push(`- ${r.title} (${r.url})`);
      if (r.content.trim()) {
        const body = r.content.trim();
        lines.push(`  ${body.slice(0, maxSnippet)}${body.length > maxSnippet ? "…" : ""}`);
      }
    }
  }
  return lines.join("\n");
}

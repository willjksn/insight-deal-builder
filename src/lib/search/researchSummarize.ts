import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { formatTavilyResultsForPrompt, TavilySearchResponse } from "@/lib/search/tavilyClient";

export async function summarizeWebResearch<T>(
  systemPrompt: string,
  search: TavilySearchResponse,
  contextLines: string[]
): Promise<T> {
  const userPrompt = [
    ...contextLines,
    "",
    "=== WEB RESEARCH (via Tavily) ===",
    formatTavilyResultsForPrompt(search, { maxSnippetChars: 1400, maxResults: 28 }),
    "",
    "Synthesize the research into the requested JSON.",
    "Be evidence-first and skeptical. Prefer fewer solid prospects over weak filler.",
    "Do not invent URLs, emails, phones, or people. Only cite sources that appear above.",
  ]
    .filter(Boolean)
    .join("\n");

  return callGeminiJsonText(systemPrompt, userPrompt) as Promise<T>;
}

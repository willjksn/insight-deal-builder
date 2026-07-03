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
    formatTavilyResultsForPrompt(search),
    "",
    "Synthesize the research into the requested JSON. Prefer practical, shootable advice.",
    "Do not invent URLs. Only cite source titles that appear above.",
  ]
    .filter(Boolean)
    .join("\n");

  return callGeminiJsonText(systemPrompt, userPrompt) as Promise<T>;
}

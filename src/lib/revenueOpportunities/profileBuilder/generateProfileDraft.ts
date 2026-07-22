import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilySearch, formatTavilyResultsForPrompt } from "@/lib/search/tavilyClient";
import type { BusinessProfileType } from "@/lib/revenueOpportunities/types/businessProfile";
import { PROFILE_BUILDER_SYSTEM } from "@/lib/revenueOpportunities/profileBuilder/prompts";
import {
  mockProfileDraft,
  parseProfileDraft,
  type ProfileDraftResult,
} from "@/lib/revenueOpportunities/profileBuilder/parseProfileDraft";

const TYPE_LINE: Record<BusinessProfileType, string> = {
  img: "Profile is for Insight Media Group (cinematic video/photo production for businesses).",
  stormi: "Profile is for Stormi (a creator running brand partnerships with IMG production).",
  other: "Profile is for a business-development persona.",
};

export interface GenerateProfileDraftInput {
  profileType: BusinessProfileType;
  sourceText?: string;
  sourceUrl?: string;
}

export async function generateProfileDraft(
  input: GenerateProfileDraftInput
): Promise<{ draft: ProfileDraftResult; usedLiveAi: boolean }> {
  const text = (input.sourceText ?? "").trim();

  if (aiUsesMock()) {
    return { draft: mockProfileDraft(input.profileType, text), usedLiveAi: false };
  }

  const lines: string[] = [TYPE_LINE[input.profileType]];

  if (text) {
    lines.push("", "=== PASTED MATERIAL ===", text.slice(0, 12_000));
  }

  const url = input.sourceUrl?.trim();
  if (url) {
    try {
      const search = await tavilySearch(url, {
        maxResults: 6,
        searchDepth: "advanced",
        includeAnswer: true,
      });
      if (search.results.length) {
        lines.push(
          "",
          "=== WEB RESEARCH (via Tavily) ===",
          formatTavilyResultsForPrompt(search, { maxSnippetChars: 1400, maxResults: 12 })
        );
      }
    } catch {
      // Research is best-effort; fall back to pasted material only.
    }
  }

  lines.push("", "Extract the profile as the requested JSON. Omit unsupported fields.");

  const raw = await callGeminiJsonText(PROFILE_BUILDER_SYSTEM, lines.join("\n"));
  return { draft: parseProfileDraft(raw), usedLiveAi: true };
}

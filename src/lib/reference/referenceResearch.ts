import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch, tavilyAvailable } from "@/lib/search/tavilyClient";
import { logGeminiTextUsage, logTavilyUsage } from "@/lib/ai/usageLog";
import { DEFAULT_REFERENCE_GUIDE } from "@/lib/reference/defaultGuide";
import { ReferenceGuideDraft, ReferenceGuideDocument, ReferenceSection } from "@/lib/reference/types";

const RESEARCH_SYSTEM = `You maintain an on-set filmmaking reference guide for ShootSpine.
Given web research and the CURRENT guide JSON, propose UPDATED sections.

Rules:
- Preserve section ids when updating existing topics; add new ids only for genuinely new sections.
- Keep practical on-set advice: lighting ratios, IRE, Sony FX6/FX3/FX30/a7IV, lenses, LIT DUO workflow.
- Numbers must be conservative and shootable (IRE, ratios, ISO). Prefer Sony official specs when cited.
- Do not remove entire categories without reason.
- Return JSON only:
{
  "changeSummary": "2-4 sentences — what changed and why",
  "sourceTitles": ["titles from research"],
  "sections": [
    {
      "id": "string-kebab-case",
      "category": "start|workflow|lighting|looks|cameras|lenses|movement|audio|templates",
      "title": "string",
      "summary": "optional one line",
      "body": "markdown-friendly plain text",
      "tables": [{ "headers": ["..."], "rows": [["..."]] }],
      "tips": ["optional bullet tips"]
    }
  ]
}`;

function guideOutlineForPrompt(guide: ReferenceGuideDocument): string {
  return guide.sections
    .map((s) => `- ${s.id} (${s.category}): ${s.title}`)
    .join("\n");
}

export async function researchReferenceGuideUpdates(
  guide: ReferenceGuideDocument,
  focusNote?: string
): Promise<ReferenceGuideDraft> {
  if (!tavilyAvailable()) {
    throw new Error("TAVILY_API_KEY is not configured — cannot research updates");
  }

  const year = new Date().getFullYear();
  const query = [
    `Sony FX6 FX3 FX30 a7IV cinema camera settings S-Cinetone S-Log3 Cine EI ${year}`,
    "lighting ratio IRE waveform interview exposure",
    "filmmaking lens focal length interview cinematic",
    focusNote?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const search = await tavilySearch(query, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });

  logTavilyUsage("advanced");

  const raw = await summarizeWebResearch<{
    changeSummary?: string;
    sourceTitles?: string[];
    sections?: ReferenceSection[];
  }>(RESEARCH_SYSTEM, search, [
    "CURRENT GUIDE OUTLINE:",
    guideOutlineForPrompt(guide),
    "",
    "CURRENT GUIDE JSON (abbreviated — update in place):",
    JSON.stringify({ title: guide.title, sections: guide.sections.slice(0, 5) }, null, 0).slice(0, 12000),
    "",
    focusNote?.trim() ? `Admin focus: ${focusNote.trim()}` : "",
    "",
    "Return the FULL updated sections array (all sections — merged updates + unchanged sections from current guide).",
  ]);

  logGeminiTextUsage({ provider: "gemini_api" });

  const sections =
    Array.isArray(raw.sections) && raw.sections.length > 0
      ? raw.sections.filter((s): s is ReferenceSection => Boolean(s?.id && s?.title))
      : guide.sections;

  return {
    sections,
    changeSummary:
      raw.changeSummary?.trim() ||
      "Research completed — review section changes before publishing.",
    researchedAt: new Date().toISOString(),
    query,
    sourceTitles: Array.isArray(raw.sourceTitles)
      ? raw.sourceTitles.filter((t): t is string => typeof t === "string")
      : search.results.map((r) => r.title).filter(Boolean),
  };
}

export function draftToGuide(
  draft: ReferenceGuideDraft,
  base: ReferenceGuideDocument = DEFAULT_REFERENCE_GUIDE
): ReferenceGuideDocument {
  return {
    ...base,
    version: (base.version ?? 1) + 1,
    sections: draft.sections,
    updatedAt: draft.researchedAt,
  };
}

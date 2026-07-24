import {
  formatBriefForPrompt,
  resolveMoodLabel,
  SCRIPT_CONTENT_TYPE_LABELS,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";
import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch, tavilyAvailable } from "@/lib/search/tavilyClient";
import { ScriptReferenceResearch } from "@/lib/scriptWriter/types";

const REFERENCES_SYSTEM = `You are a film development researcher. From web results about comparable films/videos, extract ABSTRACT CRAFT PATTERNS only — never reproduce plots, characters, or dialogue. Name a few comparable works for orientation, then generalize HOW they work so a writer can apply the craft to an original story.

Return JSON only:
{
  "comparableTitles": ["2-4 comparable works — titles only, for orientation"],
  "summary": "2-3 sentences on the shared craft approach for this concept/genre",
  "structure": ["structural / act / sequence patterns — max 4"],
  "tone": ["tone & character-dynamic patterns — max 4"],
  "visualLanguage": ["cinematography / visual motifs — max 4"],
  "emulate": ["specific patterns to lean into for THIS piece — max 4"],
  "avoid": ["cliches / traps to skip — max 3"],
  "sourceTitles": ["source titles from the research"]
}

Rules: patterns, not plots. Do not copy copyrighted story specifics, character names, or lines.`;

function pickStrings(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, max)
    : [];
}

function buildReferenceQuery(brief: ScriptWriterBrief): string {
  const type = SCRIPT_CONTENT_TYPE_LABELS[brief.contentType];
  const genre = brief.genre?.trim();
  const mood = resolveMoodLabel(brief);
  const concept = brief.concept.trim().slice(0, 100);

  const parts = [
    genre ? `${genre} films examples` : `${type} examples`,
    "comparable movies structure tone cinematography craft",
    mood,
  ];
  if (concept) parts.push(`similar in spirit to: ${concept}`);
  return parts.join(" ");
}

/** Live Tavily search for comparable works, summarized by Gemini into craft patterns. */
export async function researchScriptReferences(
  brief: ScriptWriterBrief
): Promise<ScriptReferenceResearch> {
  if (!tavilyAvailable()) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const query = buildReferenceQuery(brief);
  const search = await tavilySearch(query, {
    maxResults: 6,
    searchDepth: "basic",
    includeAnswer: true,
  });

  const raw = await summarizeWebResearch<Partial<ScriptReferenceResearch>>(REFERENCES_SYSTEM, search, [
    "Brief for the script:",
    formatBriefForPrompt(brief),
  ]);

  const sourceTitles = pickStrings(raw.sourceTitles, 6);
  return {
    query,
    provider: "tavily",
    searchedAt: new Date().toISOString(),
    contentType: brief.contentType,
    comparableTitles: pickStrings(raw.comparableTitles, 4),
    summary: raw.summary?.trim() || "Comparable-work craft patterns researched for this concept.",
    structure: pickStrings(raw.structure, 4),
    tone: pickStrings(raw.tone, 4),
    visualLanguage: pickStrings(raw.visualLanguage, 4),
    emulate: pickStrings(raw.emulate, 4),
    avoid: pickStrings(raw.avoid, 3),
    sourceTitles: sourceTitles.length ? sourceTitles : search.results.map((r) => r.title).slice(0, 6),
  };
}

export function formatReferencesForPrompt(ref: ScriptReferenceResearch): string {
  const lines = [
    "=== COMPARABLE-WORK CRAFT PATTERNS (inspiration only — never copy plots, characters, or lines) ===",
    ref.summary,
  ];
  if (ref.comparableTitles.length) {
    lines.push("", `Comparable works (orientation only): ${ref.comparableTitles.join(", ")}`);
  }
  if (ref.structure.length) {
    lines.push("", "Structure:", ...ref.structure.map((s) => `- ${s}`));
  }
  if (ref.tone.length) {
    lines.push("", "Tone & character dynamics:", ...ref.tone.map((s) => `- ${s}`));
  }
  if (ref.visualLanguage.length) {
    lines.push("", "Visual language:", ...ref.visualLanguage.map((s) => `- ${s}`));
  }
  if (ref.emulate.length) {
    lines.push("", "Lean into:", ...ref.emulate.map((s) => `- ${s}`));
  }
  if (ref.avoid?.length) {
    lines.push("", "Avoid:", ...ref.avoid.map((s) => `- ${s}`));
  }
  return lines.join("\n");
}

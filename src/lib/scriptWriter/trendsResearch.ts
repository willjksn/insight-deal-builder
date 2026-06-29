import { Firestore } from "firebase-admin/firestore";
import {
  formatBriefForPrompt,
  resolveMoodLabel,
  resolveRuntimeLabel,
  SCRIPT_CONTENT_TYPE_LABELS,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";
import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { getFreshTrendSnapshot,
  getTrendSnapshot,
  snapshotToSessionResearch,
} from "@/lib/search/trendSnapshots";
import { tavilySearch, tavilyAvailable } from "@/lib/search/tavilyClient";
import { ScriptTrendsResearch } from "@/lib/scriptWriter/types";

const TRENDS_SYSTEM = `You are a creative researcher for a production company. Given web search results about current video trends, return JSON only:
{
  "summary": "2-3 sentence overview of what's working now for this format",
  "hooks": ["opening hook patterns that perform — max 5"],
  "pacingNotes": ["pacing / structure notes — max 4"],
  "framingIdeas": ["camera / visual ideas — max 4"],
  "avoid": ["clichés or overused patterns to skip — max 3"],
  "sourceTitles": ["source titles from the research"]
}`;

function buildLiveTrendsQuery(brief: ScriptWriterBrief): string {
  const type = SCRIPT_CONTENT_TYPE_LABELS[brief.contentType];
  const mood = resolveMoodLabel(brief);
  const runtime = resolveRuntimeLabel(brief);
  const year = new Date().getFullYear();
  const conceptSnippet = brief.concept.trim().slice(0, 80);

  const parts = [
    `${type} video trends ${year}`,
    `${runtime} format`,
    `${mood} tone`,
    "social media hooks pacing",
  ];
  if (brief.contentType === "social_reel" || brief.contentType === "commercial") {
    parts.push("Instagram Reels TikTok Shorts best practices");
  }
  if (brief.contentType === "trailer") {
    parts.push("film trailer teaser pacing structure");
  }
  if (conceptSnippet) {
    parts.push(conceptSnippet);
  }
  return parts.join(" ");
}

/** Live Tavily search tailored to this session's brief. */
export async function researchScriptTrendsLive(brief: ScriptWriterBrief): Promise<ScriptTrendsResearch> {
  if (!tavilyAvailable()) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const query = buildLiveTrendsQuery(brief);
  const search = await tavilySearch(query, {
    maxResults: 6,
    searchDepth: "basic",
    includeAnswer: true,
  });

  const raw = await summarizeWebResearch<Partial<ScriptTrendsResearch>>(TRENDS_SYSTEM, search, [
    "Brief for the script:",
    formatBriefForPrompt(brief),
  ]);

  const research: ScriptTrendsResearch = {
    query,
    provider: "tavily",
    searchedAt: new Date().toISOString(),
    contentType: brief.contentType,
    source: "live",
    summary: raw.summary?.trim() || "Current trends researched for this format.",
    hooks: Array.isArray(raw.hooks) ? raw.hooks.filter((h): h is string => typeof h === "string").slice(0, 5) : [],
    pacingNotes: Array.isArray(raw.pacingNotes)
      ? raw.pacingNotes.filter((h): h is string => typeof h === "string").slice(0, 4)
      : [],
    framingIdeas: Array.isArray(raw.framingIdeas)
      ? raw.framingIdeas.filter((h): h is string => typeof h === "string").slice(0, 4)
      : [],
    avoid: Array.isArray(raw.avoid) ? raw.avoid.filter((h): h is string => typeof h === "string").slice(0, 3) : [],
    sourceTitles: Array.isArray(raw.sourceTitles)
      ? raw.sourceTitles.filter((h): h is string => typeof h === "string").slice(0, 6)
      : search.results.map((r) => r.title).slice(0, 6),
  };

  return research;
}

/**
 * Cache-first trend research: weekly Firestore snapshot when fresh, else live Tavily.
 */
export async function researchScriptTrends(
  brief: ScriptWriterBrief,
  options?: { forceLive?: boolean; db?: Firestore }
): Promise<ScriptTrendsResearch> {
  const db = options?.db;

  if (!options?.forceLive && db) {
    const cached = await getFreshTrendSnapshot(db, brief.contentType);
    if (cached) {
      return snapshotToSessionResearch(cached, "cache");
    }
    if (!tavilyAvailable()) {
      const stale = await getTrendSnapshot(db, brief.contentType);
      if (stale) {
        return snapshotToSessionResearch(stale, "cache");
      }
    }
  }

  return researchScriptTrendsLive(brief);
}

export function formatTrendsForPrompt(trends: ScriptTrendsResearch): string {
  const sourceNote =
    trends.source === "cache"
      ? " (weekly baseline snapshot — use as inspiration, not verbatim copy)"
      : " (live Tavily search — use as inspiration, not verbatim copy)";

  const lines = [`=== CURRENT TRENDS RESEARCH${sourceNote} ===`, trends.summary];
  if (trends.hooks.length) {
    lines.push("", "Hook patterns:", ...trends.hooks.map((h) => `- ${h}`));
  }
  if (trends.pacingNotes.length) {
    lines.push("", "Pacing:", ...trends.pacingNotes.map((h) => `- ${h}`));
  }
  if (trends.framingIdeas.length) {
    lines.push("", "Visual / framing:", ...trends.framingIdeas.map((h) => `- ${h}`));
  }
  if (trends.avoid?.length) {
    lines.push("", "Avoid:", ...trends.avoid.map((h) => `- ${h}`));
  }
  return lines.join("\n");
}

import { Firestore } from "firebase-admin/firestore";
import { ScriptContentType } from "@/lib/scriptWriter/brief";
import {
  getFreshTrendSnapshot,
  getTrendSnapshot,
  snapshotToSessionResearch,
} from "@/lib/search/trendSnapshots";
import { formatTrendsForPrompt } from "@/lib/scriptWriter/trendsResearch";
import { ScriptTrendsResearch } from "@/lib/scriptWriter/types";

/** Map idea-engine content format tags to weekly trend snapshot keys. */
const FORMAT_TO_CONTENT_TYPE: Record<string, ScriptContentType> = {
  cinematic_commercial: "commercial",
  narrative_short: "short_film",
  lifestyle_reel: "social_reel",
  product_demo: "commercial",
  educational: "documentary",
  talking_head: "interview",
  voiceover: "commercial",
  testimonial: "interview",
  behind_the_scenes: "brand_story",
  mini_documentary: "documentary",
  comedy: "social_reel",
  horror: "short_film",
  thriller: "short_film",
  romance: "short_film",
  beauty: "commercial",
  fashion: "commercial",
  fitness: "social_reel",
  transformation: "social_reel",
  day_in_life: "social_reel",
  interview: "interview",
  podcast_clip: "interview",
  photo_campaign: "commercial",
  carousel: "social_reel",
  teaser: "trailer",
  trailer: "trailer",
  direct_response: "commercial",
  recurring_series: "social_reel",
};

const PLATFORM_CONTENT_TYPE: Record<string, ScriptContentType> = {
  instagram_reels: "social_reel",
  tiktok: "social_reel",
  youtube_shorts: "social_reel",
  youtube: "brand_story",
  paid_ad: "commercial",
};

export function resolveTrendContentType(
  contentFormats: string[] = [],
  platforms: string[] = []
): ScriptContentType {
  for (const format of contentFormats) {
    const key = format.toLowerCase().replace(/\s+/g, "_");
    if (FORMAT_TO_CONTENT_TYPE[key]) return FORMAT_TO_CONTENT_TYPE[key];
  }
  for (const platform of platforms) {
    const key = platform.toLowerCase().replace(/\s+/g, "_");
    if (PLATFORM_CONTENT_TYPE[key]) return PLATFORM_CONTENT_TYPE[key];
  }
  return "social_reel";
}

/**
 * Weekly Tavily snapshots only — no live search per idea generation.
 * Uses fresh snapshot when available, else most recent stale snapshot.
 */
export async function resolveWeeklyTrendsForIdeas(
  db: Firestore,
  contentFormats: string[],
  platforms: string[]
): Promise<{ research: ScriptTrendsResearch | null; contentType: ScriptContentType }> {
  const contentType = resolveTrendContentType(contentFormats, platforms);
  const fresh = await getFreshTrendSnapshot(db, contentType);
  if (fresh) {
    return { research: snapshotToSessionResearch(fresh, "cache"), contentType };
  }
  const stale = await getTrendSnapshot(db, contentType);
  if (stale) {
    return { research: snapshotToSessionResearch(stale, "cache"), contentType };
  }
  return { research: null, contentType };
}

export function formatWeeklyTrendsForIdeaPrompt(research: ScriptTrendsResearch | null): string {
  if (!research) {
    return `=== WEEKLY TREND BASELINE ===
No weekly trend snapshot is available yet for this format. Rely on profile, goals, and production constraints. Admin weekly cron refreshes trendSnapshots.`;
  }
  return formatTrendsForPrompt(research);
}

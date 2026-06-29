import { FieldValue, Firestore } from "firebase-admin/firestore";
import { ScriptContentType, SCRIPT_CONTENT_TYPE_LABELS } from "@/lib/scriptWriter/brief";
import { ScriptTrendsResearch } from "@/lib/scriptWriter/types";
import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch, tavilyAvailable } from "@/lib/search/tavilyClient";
import { stripUndefined } from "@/lib/firebase/firestore";

export const TREND_SNAPSHOTS_COLLECTION = "trendSnapshots";

/** Cached snapshots older than this are refreshed on next weekly cron or live search. */
export const TREND_SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const WEEKLY_CONTENT_TYPES: ScriptContentType[] = [
  "social_reel",
  "commercial",
  "trailer",
  "brand_story",
  "short_film",
  "documentary",
  "music_video",
  "interview",
  "other",
];

const TRENDS_SYSTEM = `You are a creative researcher for a production company. Given web search results about current video trends, return JSON only:
{
  "summary": "2-3 sentence overview of what's working now for this format",
  "hooks": ["opening hook patterns that perform — max 5"],
  "pacingNotes": ["pacing / structure notes — max 4"],
  "framingIdeas": ["camera / visual ideas — max 4"],
  "avoid": ["clichés or overused patterns to skip — max 3"],
  "sourceTitles": ["source titles from the research"]
}`;

export interface TrendSnapshot {
  contentType: ScriptContentType;
  query: string;
  provider: "tavily";
  searchedAt: string;
  weekKey: string;
  summary: string;
  hooks: string[];
  pacingNotes: string[];
  framingIdeas: string[];
  avoid: string[];
  sourceTitles: string[];
}

export function isoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function buildWeeklyTrendsQuery(contentType: ScriptContentType): string {
  const type = SCRIPT_CONTENT_TYPE_LABELS[contentType];
  const year = new Date().getFullYear();
  const parts = [`${type} video trends ${year}`, "hooks pacing structure", "social media best practices"];
  if (contentType === "social_reel" || contentType === "commercial") {
    parts.push("Instagram Reels TikTok YouTube Shorts");
  }
  if (contentType === "trailer") {
    parts.push("movie trailer film teaser pacing structure");
  }
  if (contentType === "documentary" || contentType === "interview") {
    parts.push("documentary interview filmmaking techniques");
  }
  return parts.join(" ");
}

function parseTrendFields(
  raw: Partial<ScriptTrendsResearch>,
  search: Awaited<ReturnType<typeof tavilySearch>>
): Omit<TrendSnapshot, "contentType" | "weekKey"> {
  return {
    query: search.query,
    provider: "tavily",
    searchedAt: new Date().toISOString(),
    summary: raw.summary?.trim() || "Current trends for this format.",
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
}

export function snapshotToSessionResearch(
  snapshot: TrendSnapshot,
  source: ScriptTrendsResearch["source"]
): ScriptTrendsResearch {
  return {
    query: snapshot.query,
    provider: "tavily",
    searchedAt: snapshot.searchedAt,
    contentType: snapshot.contentType,
    source,
    summary: snapshot.summary,
    hooks: snapshot.hooks,
    pacingNotes: snapshot.pacingNotes,
    framingIdeas: snapshot.framingIdeas,
    avoid: snapshot.avoid,
    sourceTitles: snapshot.sourceTitles,
  };
}

export function isTrendSnapshotFresh(searchedAt: string, maxAgeMs = TREND_SNAPSHOT_MAX_AGE_MS): boolean {
  const ts = Date.parse(searchedAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < maxAgeMs;
}

export async function getTrendSnapshot(
  db: Firestore,
  contentType: ScriptContentType
): Promise<TrendSnapshot | null> {
  const snap = await db.collection(TREND_SNAPSHOTS_COLLECTION).doc(contentType).get();
  if (!snap.exists) return null;
  return snap.data() as TrendSnapshot;
}

export async function getFreshTrendSnapshot(
  db: Firestore,
  contentType: ScriptContentType
): Promise<TrendSnapshot | null> {
  const snapshot = await getTrendSnapshot(db, contentType);
  if (!snapshot || !isTrendSnapshotFresh(snapshot.searchedAt)) return null;
  return snapshot;
}

export async function refreshTrendSnapshotForType(
  db: Firestore,
  contentType: ScriptContentType
): Promise<TrendSnapshot> {
  if (!tavilyAvailable()) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const query = buildWeeklyTrendsQuery(contentType);
  const search = await tavilySearch(query, {
    maxResults: 6,
    searchDepth: "basic",
    includeAnswer: true,
  });

  const typeLabel = SCRIPT_CONTENT_TYPE_LABELS[contentType];
  const raw = await summarizeWebResearch<Partial<ScriptTrendsResearch>>(TRENDS_SYSTEM, search, [
    `Weekly baseline research for format: ${typeLabel}`,
    `Content type key: ${contentType}`,
    "This snapshot is shared across all projects of this format until refreshed.",
  ]);

  const snapshot: TrendSnapshot = {
    contentType,
    weekKey: isoWeekKey(),
    ...parseTrendFields(raw, search),
  };

  await db.collection(TREND_SNAPSHOTS_COLLECTION).doc(contentType).set(
    stripUndefined({
      ...snapshot,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  return snapshot;
}

export async function refreshAllTrendSnapshots(db: Firestore): Promise<{
  refreshed: ScriptContentType[];
  skipped: ScriptContentType[];
  errors: Array<{ contentType: ScriptContentType; message: string }>;
}> {
  const refreshed: ScriptContentType[] = [];
  const skipped: ScriptContentType[] = [];
  const errors: Array<{ contentType: ScriptContentType; message: string }> = [];

  for (const contentType of WEEKLY_CONTENT_TYPES) {
    try {
      await refreshTrendSnapshotForType(db, contentType);
      refreshed.push(contentType);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("TAVILY")) {
        skipped.push(contentType);
      } else {
        errors.push({ contentType, message });
      }
    }
  }

  return { refreshed, skipped, errors };
}

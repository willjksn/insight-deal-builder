import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Admin-controlled search behavior. Stored in `appSettings/searchMode`
 * (server-only; the Admin SDK bypasses Firestore rules). Read on the Tavily
 * budget path with a short in-memory cache so it never adds latency per search.
 *
 * - lightweightMode: force rule-based mode — skip Tavily entirely, regardless of
 *   remaining credits. Manual override for when you want to conserve credits.
 * - autoCreditGuard: when true (default), automatically flip to rule mode as the
 *   monthly Tavily credit cap approaches. Turn off if you'd rather keep using
 *   live search right up to the hard cap.
 */
export interface SearchModeSettings {
  lightweightMode: boolean;
  autoCreditGuard: boolean;
  updatedAt?: string;
  updatedByUserId?: string;
}

export const DEFAULT_SEARCH_MODE: SearchModeSettings = {
  lightweightMode: false,
  autoCreditGuard: true,
};

const COLLECTION = "appSettings";
const DOC_ID = "searchMode";

let cache: { settings: SearchModeSettings; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Reset the cached settings (used after a save and in tests). */
export function resetSearchModeCache(): void {
  cache = null;
}

function normalize(data: Record<string, unknown> | undefined): SearchModeSettings {
  return {
    lightweightMode:
      typeof data?.lightweightMode === "boolean"
        ? data.lightweightMode
        : DEFAULT_SEARCH_MODE.lightweightMode,
    autoCreditGuard:
      typeof data?.autoCreditGuard === "boolean"
        ? data.autoCreditGuard
        : DEFAULT_SEARCH_MODE.autoCreditGuard,
    updatedAt:
      (data?.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.()?.toISOString?.() ??
      (typeof data?.updatedAt === "string" ? data.updatedAt : undefined),
    updatedByUserId:
      typeof data?.updatedByUserId === "string" ? data.updatedByUserId : undefined,
  };
}

export async function loadSearchMode(): Promise<SearchModeSettings> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.settings;

  const db = getAdminDb();
  if (!db) return { ...DEFAULT_SEARCH_MODE };

  try {
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    const settings = snap.exists ? normalize(snap.data()) : { ...DEFAULT_SEARCH_MODE };
    cache = { settings, at: now };
    return settings;
  } catch {
    // Never let a settings read break the search path.
    return { ...DEFAULT_SEARCH_MODE };
  }
}

export async function saveSearchMode(
  update: Partial<Pick<SearchModeSettings, "lightweightMode" | "autoCreditGuard">>,
  adminUserId: string
): Promise<SearchModeSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const current = await loadSearchMode();
  const next: SearchModeSettings = {
    lightweightMode: update.lightweightMode ?? current.lightweightMode,
    autoCreditGuard: update.autoCreditGuard ?? current.autoCreditGuard,
  };

  await db.collection(COLLECTION).doc(DOC_ID).set(
    {
      lightweightMode: next.lightweightMode,
      autoCreditGuard: next.autoCreditGuard,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUserId: adminUserId,
    },
    { merge: true }
  );

  resetSearchModeCache();
  return next;
}

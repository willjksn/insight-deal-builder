/**
 * Soft capacity limits for AI Editor.
 * Tuned for day-to-day ≤20 min projects, with headroom for ~2h features.
 * Raise here — avoid scattering magic numbers.
 */

/** Media assets returned per project list / dashboard. */
export const MAX_MEDIA_ASSETS = 5000;

/** Verified ingest / archive / delete files per agent batch. */
export const MAX_FILES_PER_BATCH = 500;

/** Media pool ImportMedia paths + handoff media map per Resolve bring-in. */
export const MAX_RESOLVE_MEDIA_LINK = 2000;

/** Clip names returned from Resolve reverse-sync. */
export const MAX_RESOLVE_SYNC_CLIPS = 2000;

/** Clips included in Edit-by-chat Gemini context (prefer active reel). */
export const MAX_CHAT_CONTEXT_CLIPS = 150;

/** Timeline version snapshots listed. */
export const MAX_TIMELINE_VERSIONS = 100;

/** Jobs listed on the AI Editor dashboard. */
export const MAX_JOBS_LISTED = 100;

/** Suggested target length for a single reel when splitting a feature. */
export const FEATURE_REEL_TARGET_SECONDS = 20 * 60; // 20 minutes

/** Default feature runtime used by “Set up for feature” (~1h45). */
export const FEATURE_DEFAULT_RUNTIME_SECONDS = 105 * 60;

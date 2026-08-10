/**
 * V20 — Desktop Agent minimum version for drive labels / offline / remount features.
 */

/** Features from V12–V16 need this agent build (or newer). */
export const MIN_DESKTOP_AGENT_VERSION = "0.15.0";

/** Reliable “Open Resolve app” launch (Start-Process + cmd fallback). */
export const MIN_RESOLVE_LAUNCH_AGENT_VERSION = "0.17.4";

/** Required for renaming the project folder on disk when the project name changes. */
export const MIN_PROJECT_FOLDER_RENAME_AGENT_VERSION = "0.17.8";

/** Pull phone / browser uploads from Firebase Storage onto the edit drive. */
export const MIN_PHONE_FETCH_AGENT_VERSION = "0.17.15";

export type AgentVersionStatus =
  | { ok: true; version: string }
  | {
      ok: false;
      version: string | null;
      reason: "missing" | "outdated" | "invalid";
      message: string;
    };

function parseSemver(raw: string): [number, number, number] | null {
  const m = String(raw)
    .trim()
    .replace(/^v/i, "")
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Compare a.b.c versions. Returns negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: string, b: string): number | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function isAgentVersionAtLeast(
  version: string | null | undefined,
  minimum = MIN_DESKTOP_AGENT_VERSION
): boolean {
  if (!version?.trim()) return false;
  const cmp = compareSemver(version, minimum);
  return cmp != null && cmp >= 0;
}

/** Evaluate connected agent version against the minimum for current drive features. */
export function assessAgentVersion(
  version: string | null | undefined,
  minimum = MIN_DESKTOP_AGENT_VERSION
): AgentVersionStatus {
  const v = version?.trim() || null;
  if (!v) {
    return {
      ok: false,
      version: null,
      reason: "missing",
      message: `Desktop Agent didn’t report a version. Restart it from the project folder (desktop-agent) so drive labels and offline detection work. Need ${minimum}+.`,
    };
  }
  const cmp = compareSemver(v, minimum);
  if (cmp == null) {
    return {
      ok: false,
      version: v,
      reason: "invalid",
      message: `Desktop Agent version “${v}” looks unexpected. Restart with ${minimum}+ from desktop-agent.`,
    };
  }
  if (cmp < 0) {
    return {
      ok: false,
      version: v,
      reason: "outdated",
      message: `Desktop Agent ${v} is too old for SSD/HDD labels, remount, and offline drive checks. Restart with ${minimum}+ (Stop the old helper, then Connect / Restart here).`,
    };
  }
  return { ok: true, version: v };
}

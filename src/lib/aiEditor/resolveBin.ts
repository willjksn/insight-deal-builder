/**
 * V4 — Resolve Media Pool bin helpers (path planning + plain-language results).
 * Actual ImportMedia runs in the Desktop Agent via official scripting.
 */

import { joinProjectRelative } from "@/lib/aiEditor/mediaPathResolver";

export const RESOLVE_MEDIA_BIN_NAME = "ShootSpine";

export type ResolveMediaPlanItem = {
  resolvedPath?: string;
  relativeProjectPath?: string;
};

/** Plan absolute candidates from handoff media mappings (existence checked by agent). */
export function planResolveMediaImport(input: {
  media: ResolveMediaPlanItem[];
  projectRoot?: string;
}): { candidates: string[] } {
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const item of input.media.slice(0, 200)) {
    let path = item.resolvedPath?.trim() || "";
    if (!path && input.projectRoot?.trim() && item.relativeProjectPath?.trim()) {
      path = joinProjectRelative(input.projectRoot.trim(), item.relativeProjectPath.trim());
    }
    if (!path) continue;
    const key = path.replace(/\\/g, "/").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(path);
  }
  return { candidates };
}

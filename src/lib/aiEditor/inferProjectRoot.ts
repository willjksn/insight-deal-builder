/**
 * Infer the managed ShootSpine project root from media absolute paths.
 * Used when settings still point at an old smoke/test folder after footage moved to the SSD.
 */

import { planManagedProjectFolderRename } from "@/lib/aiEditor/projectFolderRename";

function normalizeSlashes(p: string): string {
  return p.replace(/\//g, "\\");
}

/**
 * From a clip path like H:\Media\ShootSpine\Monopoly_Night\01_ORIGINAL_MEDIA\...
 * return H:\Media\ShootSpine\Monopoly_Night
 */
export function projectRootFromManagedMediaPath(absolutePath: string): string | null {
  const p = normalizeSlashes(absolutePath.trim());
  if (!p) return null;
  const lower = p.toLowerCase();
  const marker = "\\media\\shootspine\\";
  const idx = lower.indexOf(marker);
  if (idx < 0) return null;
  const after = p.slice(idx + marker.length);
  const leaf = after.split("\\").filter(Boolean)[0];
  if (!leaf) return null;
  return `${p.slice(0, idx)}\\Media\\ShootSpine\\${leaf}`;
}

/** Most common managed root among media current/archive paths. */
export function inferManagedProjectRootFromMedia(
  media: Array<{ currentPath?: string | null; archivePath?: string | null }>
): string | null {
  const counts = new Map<string, { display: string; n: number }>();
  for (const m of media) {
    for (const candidate of [m.currentPath, m.archivePath]) {
      if (!candidate) continue;
      const root = projectRootFromManagedMediaPath(candidate);
      if (!root) continue;
      const key = root.toLowerCase();
      const prev = counts.get(key);
      counts.set(key, { display: root, n: (prev?.n ?? 0) + 1 });
    }
  }
  let best: { display: string; n: number } | null = null;
  for (const v of counts.values()) {
    if (!best || v.n > best.n) best = v;
  }
  return best?.display ?? null;
}

/** Prefer settings root unless media clearly lives under a different managed SSD root. */
export function preferLiveProjectRoot(input: {
  settingsRoot?: string | null;
  mediaRoot?: string | null;
}): string | null {
  const settings = input.settingsRoot?.trim() || null;
  const media = input.mediaRoot?.trim() || null;
  if (!media) return settings;
  if (!settings) return media;
  if (settings.toLowerCase() === media.toLowerCase()) return settings;
  // Media moved to managed SSD path; settings still on old smoke/custom folder.
  return media;
}

/**
 * When the project was renamed but settings/media still use the old leaf
 * (e.g. Untitled_footage_edit → Monopoly_Night), return the path that matches the name.
 */
export function alignManagedRootWithProjectName(input: {
  projectRoot?: string | null;
  projectName?: string | null;
}): string | null {
  const root = input.projectRoot?.trim() || null;
  const name = input.projectName?.trim() || null;
  if (!root) return null;
  if (!name) return root;
  const plan = planManagedProjectFolderRename({
    currentProjectRoot: root,
    newProjectName: name,
  });
  if (plan.action === "rename") return plan.to;
  return root;
}

/** Settings/media root, preferring SSD media, then aligned to the current project name. */
export function resolveLiveProjectRoot(input: {
  settingsRoot?: string | null;
  mediaRoot?: string | null;
  projectName?: string | null;
}): string | null {
  const preferred = preferLiveProjectRoot({
    settingsRoot: input.settingsRoot,
    mediaRoot: input.mediaRoot,
  });
  return alignManagedRootWithProjectName({
    projectRoot: preferred,
    projectName: input.projectName,
  });
}

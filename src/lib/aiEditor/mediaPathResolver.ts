/**
 * Platform-aware media path resolution (V1A stub).
 * ResolveAdapter / handoff must use this instead of concatenating OS paths ad hoc.
 */

export type PathPlatform = "windows" | "macos" | "relative";

export function joinProjectRelative(projectRoot: string, relativeProjectPath: string): string {
  const root = projectRoot.replace(/[\\\/]+$/, "");
  const rel = relativeProjectPath.replace(/^[\\\/]+/, "").replace(/\\/g, "/");
  const useWin = /\\/.test(root) || /^[A-Za-z]:/.test(root);
  if (useWin) return `${root}\\${rel.replace(/\//g, "\\")}`;
  return `${root}/${rel}`;
}

export function toRelativeProjectPath(projectRoot: string, absolutePath: string): string | null {
  const root = projectRoot.replace(/[\\\/]+$/, "").replace(/\\/g, "/").toLowerCase();
  const abs = absolutePath.replace(/\\/g, "/");
  const absLower = abs.toLowerCase();
  if (!absLower.startsWith(root)) return null;
  let rel = abs.slice(root.length).replace(/^[\\\/]+/, "");
  return rel.replace(/\\/g, "/");
}

export const MediaPathResolver = {
  resolveFromProjectRoot: joinProjectRelative,
  resolveRelative: toRelativeProjectPath,
  resolveForWindows(projectRoot: string, relativeProjectPath: string) {
    return joinProjectRelative(projectRoot.replace(/\//g, "\\"), relativeProjectPath);
  },
  resolveForMacOS(projectRoot: string, relativeProjectPath: string) {
    return joinProjectRelative(projectRoot.replace(/\\/g, "/"), relativeProjectPath);
  },
};

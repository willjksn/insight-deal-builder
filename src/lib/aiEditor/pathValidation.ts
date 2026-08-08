/**
 * Path safety for Desktop Agent / storage roots.
 * Rejects traversal and ensures candidate paths stay under an authorized root.
 */

export function normalizeFsPath(input: string): string {
  return input.replace(/\//g, "\\").replace(/\\+/g, "\\").replace(/[\\\/]+$/, "");
}

export function containsPathTraversal(input: string): boolean {
  if (!input || input.includes("\0")) return true;
  const parts = input.replace(/\//g, "\\").split("\\");
  return parts.some((p) => p === "..");
}

/** True when `candidate` is equal to or nested under `root`. */
export function isPathInsideRoot(root: string, candidate: string): boolean {
  if (containsPathTraversal(root) || containsPathTraversal(candidate)) return false;
  const r = normalizeFsPath(root).toLowerCase();
  const c = normalizeFsPath(candidate).toLowerCase();
  if (!r || !c) return false;
  return c === r || c.startsWith(`${r}\\`);
}

export function assertSafeStoragePath(path: string): void {
  if (!path?.trim()) throw new Error("Storage path is required");
  if (containsPathTraversal(path)) throw new Error("Invalid storage path");
}

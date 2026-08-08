/**
 * Helpers for Desktop Agent batch copy/delete responses (per-file ok/fail).
 */

export function successfulBatchIds(
  results: Array<{ ok?: boolean; id?: string | null; deleted?: boolean }>
): Set<string> {
  const ids = new Set<string>();
  for (const r of results) {
    if (r.ok === false) continue;
    if (r.ok === true || r.deleted === true) {
      if (typeof r.id === "string" && r.id) ids.add(r.id);
    }
  }
  return ids;
}

export function batchFailureCount(
  results: Array<{ ok?: boolean }>,
  failedCount?: number
): number {
  if (typeof failedCount === "number") return failedCount;
  return results.filter((r) => r.ok === false).length;
}

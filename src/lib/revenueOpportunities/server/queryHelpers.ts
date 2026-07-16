import { isoTimestamp } from "@/lib/revenueOpportunities/server/serialize";

/** Firestore code 9 — composite index missing or still building. */
export function isFirestoreIndexPending(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? (err as { code: number }).code : undefined;
  const message = err instanceof Error ? err.message : String(err);
  return code === 9 || message.includes("FAILED_PRECONDITION") || message.includes("requires an index");
}

function sortDocsDesc(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  field: string
): FirebaseFirestore.QueryDocumentSnapshot[] {
  return [...docs].sort((a, b) => isoTimestamp(b.get(field)).localeCompare(isoTimestamp(a.get(field))));
}

/**
 * Run an ordered Firestore query; if the composite index is still building,
 * retry without orderBy and sort in memory (fine for early tenant volumes).
 */
export async function getOrderedQueryDocs(
  buildQuery: (ordered: boolean) => FirebaseFirestore.Query,
  sortField: string,
  limit?: number
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  try {
    let q = buildQuery(true);
    if (limit != null) q = q.limit(limit);
    return (await q.get()).docs;
  } catch (err) {
    if (!isFirestoreIndexPending(err)) throw err;
    let docs = sortDocsDesc((await buildQuery(false).get()).docs, sortField);
    if (limit != null) docs = docs.slice(0, limit);
    return docs;
  }
}

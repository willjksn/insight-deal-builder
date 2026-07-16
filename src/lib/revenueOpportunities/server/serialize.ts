/** Normalize Firestore Timestamp / ISO strings for API responses. */

export function isoTimestamp(value: unknown): string {
  if (!value) return new Date(0).toISOString();
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as FirebaseFirestore.Timestamp).toDate().toISOString();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const sec = (value as { _seconds: number })._seconds;
    return new Date(sec * 1000).toISOString();
  }
  return new Date(0).toISOString();
}

export function serializeDoc<T>(id: string, data: FirebaseFirestore.DocumentData): T {
  const out = { id, ...data } as Record<string, unknown>;
  if ("createdAt" in out) out.createdAt = isoTimestamp(out.createdAt);
  if ("updatedAt" in out) out.updatedAt = isoTimestamp(out.updatedAt);
  return out as T;
}

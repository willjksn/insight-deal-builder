export function mergeGearItems(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((item) => item.toLowerCase()));
  const merged = [...existing];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

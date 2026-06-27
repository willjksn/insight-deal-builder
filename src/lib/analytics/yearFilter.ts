export const ANALYTICS_START_YEAR = 2026;

export function getAnalyticsYearOptions(currentYear = new Date().getFullYear()) {
  const start = Math.min(ANALYTICS_START_YEAR, currentYear);
  return Array.from({ length: Math.max(1, currentYear - start + 1) }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
  }).filter((opt) => Number(opt.value) >= ANALYTICS_START_YEAR);
}

export function parseYearParam(value: string | null | undefined, fallback?: number): number {
  const year = Number(value);
  const currentYear = new Date().getFullYear();
  const defaultYear = fallback ?? Math.max(ANALYTICS_START_YEAR, currentYear);
  if (!Number.isFinite(year) || year < ANALYTICS_START_YEAR) return defaultYear;
  return year;
}

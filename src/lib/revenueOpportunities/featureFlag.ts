/** Feature flag — set REVENUE_OPPORTUNITIES_ENABLED=false to hide UI and disable API. */

export const REVENUE_OPPORTUNITIES_PHASE = 6;

export function isRevenueOpportunitiesEnabled(): boolean {
  const raw = process.env.REVENUE_OPPORTUNITIES_ENABLED;
  if (raw === undefined || raw === "") return true;
  return raw === "1" || raw.toLowerCase() === "true";
}

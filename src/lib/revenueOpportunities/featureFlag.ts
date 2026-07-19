/**
 * Feature flag — Revenue & Opportunities is available by default.
 * Set REVENUE_OPPORTUNITIES_ENABLED=false (or NEXT_PUBLIC_…) to hide UI and block API.
 */

export const REVENUE_OPPORTUNITIES_PHASE = 10;

export function isRevenueOpportunitiesEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_REVENUE_OPPORTUNITIES_ENABLED ??
    process.env.REVENUE_OPPORTUNITIES_ENABLED;
  if (raw === undefined || raw === "") return true;
  return raw === "1" || raw.toLowerCase() === "true";
}

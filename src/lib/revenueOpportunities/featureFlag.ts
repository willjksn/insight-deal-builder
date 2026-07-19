/**
 * Feature flag — Revenue is a second product. Default OFF so the shoot spine stays focused.
 * Set REVENUE_OPPORTUNITIES_ENABLED=true to show UI and enable API.
 */

export const REVENUE_OPPORTUNITIES_PHASE = 10;

export function isRevenueOpportunitiesEnabled(): boolean {
  const raw = process.env.REVENUE_OPPORTUNITIES_ENABLED;
  if (raw === undefined || raw === "") return false;
  return raw === "1" || raw.toLowerCase() === "true";
}

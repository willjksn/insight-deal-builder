import type {
  LiveFitScoreBreakdown,
  LiveFinancialEstimate,
  LiveTravelClass,
} from "@/lib/liveProduction/types";

export type ScoreInput = {
  equipmentMatchPct: number;
  crewMatchPct: number;
  ownedCoveragePct: number;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  estimatedSubRental?: number;
  distanceMiles?: number | null;
  isPartnerSubcontract?: boolean;
  organizationName?: string;
  city?: string;
  state?: string;
  homeState?: string;
  serviceRadiusMiles?: number;
};

export function classifyTravel(
  distanceMiles: number | null | undefined,
  serviceRadiusMiles = 250
): LiveTravelClass {
  if (distanceMiles == null || !Number.isFinite(distanceMiles)) return "regional";
  if (distanceMiles <= 40) return "local";
  if (distanceMiles <= serviceRadiusMiles) return "regional";
  if (distanceMiles <= serviceRadiusMiles * 1.5) return "extended";
  return "fly_date";
}

export function estimateFinancials(input: {
  valueLow?: number;
  valueHigh?: number;
  ownedCoveragePct: number;
  equipmentMatchPct: number;
  crewMatchPct: number;
  subRentalSummary?: string;
}): LiveFinancialEstimate {
  const mid =
    input.valueLow != null && input.valueHigh != null
      ? (input.valueLow + input.valueHigh) / 2
      : input.valueHigh ?? input.valueLow ?? 25000;
  const internalShare = Math.min(0.7, Math.max(0.25, input.ownedCoveragePct / 100 * 0.65));
  const laborShare = 0.22 + (100 - input.crewMatchPct) / 1000;
  const subShare = input.subRentalSummary && !/none/i.test(input.subRentalSummary) ? 0.12 : 0.04;
  const transport = Math.round(mid * 0.04);
  const other = Math.round(mid * 0.03);
  const internalEquipmentRevenue = Math.round(mid * internalShare);
  const labor = Math.round(mid * laborShare);
  const subRental = Math.round(mid * subShare);
  const costs = labor + subRental + transport + other;
  const margin = mid > 0 ? Math.round(((mid - costs) / mid) * 100) : undefined;

  return {
    clientRevenueLow: input.valueLow,
    clientRevenueHigh: input.valueHigh,
    internalEquipmentRevenue,
    labor,
    subRental,
    transportation: transport,
    otherCosts: other,
    estimatedGrossMarginPct: margin,
    assumptions: [
      "Preliminary model only — not a formal quote.",
      "Internal equipment revenue assumed from owned coverage share.",
      "Labor and sub-rental are rough placeholders until package rates are confirmed.",
    ],
    isEstimate: true,
  };
}

export function computeFitScore(input: ScoreInput): LiveFitScoreBreakdown {
  const radius = input.serviceRadiusMiles ?? 250;
  const travel = classifyTravel(input.distanceMiles, radius);
  const geo =
    travel === "local" ? 95 : travel === "regional" ? 80 : travel === "extended" ? 55 : 35;
  const homeBoost =
    input.state && input.homeState && input.state.toLowerCase() === input.homeState.toLowerCase()
      ? 5
      : 0;

  const mid =
    input.estimatedValueLow != null && input.estimatedValueHigh != null
      ? (input.estimatedValueLow + input.estimatedValueHigh) / 2
      : input.estimatedValueHigh ?? input.estimatedValueLow ?? 0;
  const profit =
    mid <= 0
      ? 50
      : mid >= 15000
        ? 88
        : mid >= 5000
          ? 72
          : 45;

  const org = input.organizationName
    ? /city|county|university|college|church|festival/i.test(input.organizationName)
      ? 82
      : 70
    : 60;

  const strategic = input.isPartnerSubcontract ? 75 : 80;
  const win = Math.round((input.equipmentMatchPct * 0.6 + input.crewMatchPct * 0.4));
  const complexity = Math.max(
    30,
    90 - Math.round((100 - input.ownedCoveragePct) * 0.5)
  );

  const equipmentMatch = clamp(input.equipmentMatchPct);
  const crewMatch = clamp(input.crewMatchPct);
  const geographicFit = clamp(geo + homeBoost);
  const profitability = clamp(profit);
  const organizationQuality = clamp(org);
  const strategicValue = clamp(strategic);
  const winProbability = clamp(win);
  const complexityRisk = clamp(complexity);

  const total = Math.round(
    equipmentMatch * 0.25 +
      crewMatch * 0.15 +
      profitability * 0.2 +
      geographicFit * 0.1 +
      organizationQuality * 0.1 +
      strategicValue * 0.1 +
      winProbability * 0.05 +
      complexityRisk * 0.05
  );

  const gaps =
    input.ownedCoveragePct >= 90
      ? "most required equipment"
      : `${input.ownedCoveragePct}% owned coverage`;

  const place =
    input.city && input.state
      ? `${input.city}, ${input.state}`
      : input.state || "the service area";

  return {
    equipmentMatch,
    crewMatch,
    profitability,
    geographicFit,
    organizationQuality,
    strategicValue,
    winProbability,
    complexityRisk,
    total: clamp(total),
    explanation: `Strong signals on ${gaps} with crew match ${crewMatch}% near ${place}. Travel class: ${travel.replace("_", " ")}.`,
  };
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

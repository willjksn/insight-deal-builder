import type { CrewMember, EquipmentCatalogItem } from "@/lib/types";
import { matchCrewRequirements } from "@/lib/liveProduction/crewMatch";
import { matchEquipmentRequirements } from "@/lib/liveProduction/equipmentMatch";
import { classifyTravel, computeFitScore, estimateFinancials } from "@/lib/liveProduction/scoring";
import type { LiveOpportunity } from "@/lib/liveProduction/types";

export function rematchLiveOpportunity(
  opportunity: LiveOpportunity,
  catalog: EquipmentCatalogItem[],
  crew: CrewMember[],
  opts?: { homeState?: string; serviceRadiusMiles?: number; distanceMiles?: number | null }
): LiveOpportunity {
  const eq = matchEquipmentRequirements(opportunity.equipmentRequirements, catalog);
  const cr = matchCrewRequirements(opportunity.crewRequirements, crew);
  const distanceMiles = opts?.distanceMiles ?? opportunity.distanceMiles ?? null;
  const travelClass = classifyTravel(distanceMiles, opts?.serviceRadiusMiles ?? 250);
  const financialEstimate = estimateFinancials({
    valueLow: opportunity.estimatedValueLow,
    valueHigh: opportunity.estimatedValueHigh,
    ownedCoveragePct: eq.ownedCoveragePct,
    equipmentMatchPct: eq.matchPct,
    crewMatchPct: cr.matchPct,
    subRentalSummary: eq.subRentalSummary,
  });
  const fitScore = computeFitScore({
    equipmentMatchPct: eq.matchPct,
    crewMatchPct: cr.matchPct,
    ownedCoveragePct: eq.ownedCoveragePct,
    estimatedValueLow: opportunity.estimatedValueLow,
    estimatedValueHigh: opportunity.estimatedValueHigh,
    estimatedSubRental: financialEstimate.subRental,
    distanceMiles,
    isPartnerSubcontract: opportunity.isPartnerSubcontract,
    organizationName: opportunity.organizationName,
    city: opportunity.city,
    state: opportunity.state,
    homeState: opts?.homeState ?? "NC",
    serviceRadiusMiles: opts?.serviceRadiusMiles ?? 250,
  });

  return {
    ...opportunity,
    equipmentMatches: eq.rows,
    crewMatches: cr.rows,
    ownedCoveragePct: eq.ownedCoveragePct,
    equipmentMatchPct: eq.matchPct,
    crewMatchPct: cr.matchPct,
    subRentalSummary: eq.subRentalSummary,
    financialEstimate,
    fitScore,
    travelClass,
    distanceMiles,
    updatedAt: new Date().toISOString(),
  };
}

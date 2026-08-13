import type {
  LiveCrewRequirement,
  LiveEquipmentRequirement,
  LiveOpportunity,
} from "@/lib/liveProduction/types";
import { estimateFinancials, computeFitScore } from "@/lib/liveProduction/scoring";

export function newReqId(): string {
  return `r_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function emptyLiveOpportunity(
  partial: Partial<LiveOpportunity> &
    Pick<LiveOpportunity, "organizationCompany" | "ownerUserId" | "title" | "organizationName">
): LiveOpportunity {
  const now = new Date().toISOString();
  const equipmentRequirements = partial.equipmentRequirements || [];
  const crewRequirements = partial.crewRequirements || [];
  const ownedCoveragePct = partial.ownedCoveragePct ?? 0;
  const equipmentMatchPct = partial.equipmentMatchPct ?? 0;
  const crewMatchPct = partial.crewMatchPct ?? 0;
  const financialEstimate =
    partial.financialEstimate ||
    estimateFinancials({
      valueLow: partial.estimatedValueLow,
      valueHigh: partial.estimatedValueHigh,
      ownedCoveragePct,
      equipmentMatchPct,
      crewMatchPct,
      subRentalSummary: partial.subRentalSummary,
    });
  const fitScore =
    partial.fitScore ||
    computeFitScore({
      equipmentMatchPct,
      crewMatchPct,
      ownedCoveragePct,
      estimatedValueLow: partial.estimatedValueLow,
      estimatedValueHigh: partial.estimatedValueHigh,
      distanceMiles: partial.distanceMiles,
      isPartnerSubcontract: partial.isPartnerSubcontract,
      organizationName: partial.organizationName,
      city: partial.city,
      state: partial.state,
      homeState: "NC",
    });

  return {
    id: partial.id || "",
    organizationCompany: partial.organizationCompany,
    ownerUserId: partial.ownerUserId,
    assignedUserId: partial.assignedUserId ?? partial.ownerUserId,
    title: partial.title,
    organizationName: partial.organizationName,
    opportunityType: partial.opportunityType || "Live Production",
    sourceKind: partial.sourceKind || "manual",
    sourceLabel: partial.sourceLabel,
    sourceUrl: partial.sourceUrl,
    solicitationNumber: partial.solicitationNumber,
    location: partial.location,
    venue: partial.venue,
    city: partial.city,
    state: partial.state,
    eventDates: partial.eventDates,
    setupDate: partial.setupDate,
    strikeDate: partial.strikeDate,
    bidDeadline: partial.bidDeadline,
    questionDeadline: partial.questionDeadline,
    siteVisitDate: partial.siteVisitDate,
    estimatedValueLow: partial.estimatedValueLow,
    estimatedValueHigh: partial.estimatedValueHigh,
    contractTerm: partial.contractTerm,
    eventCount: partial.eventCount,
    contactName: partial.contactName,
    contactEmail: partial.contactEmail,
    contactPhone: partial.contactPhone,
    status: partial.status || "new",
    tags: partial.tags || [],
    rawText: partial.rawText,
    summary: partial.summary,
    isPartnerSubcontract: partial.isPartnerSubcontract || false,
    equipmentRequirements,
    crewRequirements,
    adminRequirements: partial.adminRequirements || [],
    equipmentMatches: partial.equipmentMatches || [],
    crewMatches: partial.crewMatches || [],
    ownedCoveragePct,
    equipmentMatchPct,
    crewMatchPct,
    fitScore,
    financialEstimate,
    travelClass: partial.travelClass,
    distanceMiles: partial.distanceMiles ?? null,
    subRentalSummary: partial.subRentalSummary,
    noBidReason: partial.noBidReason ?? null,
    noBidNotes: partial.noBidNotes,
    saved: partial.saved || false,
    notes: partial.notes,
    clientId: partial.clientId ?? null,
    projectId: partial.projectId ?? null,
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  };
}

export function charlotteSeedRequirements(): {
  equipment: LiveEquipmentRequirement[];
  crew: LiveCrewRequirement[];
} {
  const equipment: LiveEquipmentRequirement[] = [
    { id: newReqId(), label: "20' × 12' LED wall", quantity: 1, priority: "required", categoryHint: "LED" },
    { id: newReqId(), label: "LED processor", quantity: 1, priority: "required", categoryHint: "LED" },
    { id: newReqId(), label: "Playback computer", quantity: 1, priority: "required", categoryHint: "Video" },
    { id: newReqId(), label: "Video switcher", quantity: 1, priority: "required", categoryHint: "Video" },
    { id: newReqId(), label: "PA system / line array", quantity: 1, priority: "required", categoryHint: "Audio" },
    { id: newReqId(), label: "Wireless microphones", quantity: 12, priority: "required", categoryHint: "Audio" },
    { id: newReqId(), label: "Digital audio console", quantity: 1, priority: "required", categoryHint: "Audio" },
    { id: newReqId(), label: "Lighting package", quantity: 1, priority: "required", categoryHint: "Lighting" },
    { id: newReqId(), label: "40' box truss", quantity: 1, priority: "required", categoryHint: "Truss" },
    { id: newReqId(), label: "24' × 16' stage", quantity: 1, priority: "required", categoryHint: "Staging" },
  ];
  const crew: LiveCrewRequirement[] = [
    { id: newReqId(), role: "Technical Director", quantity: 1, priority: "required" },
    { id: newReqId(), role: "Audio A1", quantity: 1, priority: "required" },
    { id: newReqId(), role: "Lighting Director", quantity: 1, priority: "required" },
    { id: newReqId(), role: "Camera Operator", quantity: 3, priority: "required" },
    { id: newReqId(), role: "Stagehand", quantity: 6, priority: "required" },
  ];
  return { equipment, crew };
}

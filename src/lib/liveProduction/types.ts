/** Live Production Opportunities — pursuit of LED/AV/staging/live-event work. */

export type LiveOpportunityStatus =
  | "new"
  | "reviewing"
  | "qualified"
  | "pursuing"
  | "no_bid"
  | "quote_building"
  | "proposal_submitted"
  | "shortlisted"
  | "won"
  | "lost"
  | "expired";

export type LiveOpportunitySourceKind =
  | "sam_gov"
  | "nc_evp"
  | "state_procurement"
  | "county_procurement"
  | "city_procurement"
  | "university"
  | "college"
  | "convention_center"
  | "venue"
  | "event_production_company"
  | "av_company"
  | "conference_production"
  | "experiential_agency"
  | "event_agency"
  | "festival"
  | "church"
  | "corporate"
  | "partner_referral"
  | "partner_subcontract"
  | "manual"
  | "url_import"
  | "paste_import"
  | "pdf_import"
  | "email_import";

export type LiveRequirementPriority = "required" | "preferred" | "unknown";

export type LiveMatchStatus = "owned" | "partial" | "subrent" | "unmatched";

export type LiveNoBidReason =
  | "outside_service_area"
  | "insufficient_equipment"
  | "insufficient_crew"
  | "low_margin"
  | "deadline_too_soon"
  | "insurance_requirement"
  | "certification_requirement"
  | "too_complex"
  | "conflict_with_existing_event"
  | "strategic_mismatch"
  | "other";

export type LiveTravelClass = "local" | "regional" | "extended" | "fly_date";

export type LiveEquipmentRequirement = {
  id: string;
  label: string;
  categoryHint?: string;
  quantity: number;
  priority: LiveRequirementPriority;
  notes?: string;
};

export type LiveCrewRequirement = {
  id: string;
  role: string;
  quantity: number;
  priority: LiveRequirementPriority;
  notes?: string;
};

export type LiveAdminRequirement = {
  id: string;
  label: string;
  priority: LiveRequirementPriority;
  notes?: string;
};

export type LiveEquipmentMatchRow = {
  requirementId: string;
  label: string;
  quantityNeeded: number;
  quantityOwned: number;
  status: LiveMatchStatus;
  catalogItemIds: string[];
  estimatedDailyRate?: number;
  notes?: string;
};

export type LiveCrewMatchRow = {
  requirementId: string;
  role: string;
  quantityNeeded: number;
  status: "available" | "possible_freelancer" | "needs_sourcing";
  crewMemberIds: string[];
  notes?: string;
};

export type LiveFitScoreBreakdown = {
  equipmentMatch: number;
  crewMatch: number;
  profitability: number;
  geographicFit: number;
  organizationQuality: number;
  strategicValue: number;
  winProbability: number;
  complexityRisk: number;
  total: number;
  explanation: string;
};

export type LiveFinancialEstimate = {
  clientRevenueLow?: number;
  clientRevenueHigh?: number;
  internalEquipmentRevenue?: number;
  labor?: number;
  subRental?: number;
  transportation?: number;
  otherCosts?: number;
  estimatedGrossMarginPct?: number;
  assumptions: string[];
  isEstimate: true;
};

export type LiveOpportunity = {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  assignedUserId?: string | null;
  title: string;
  organizationName: string;
  opportunityType: string;
  sourceKind: LiveOpportunitySourceKind;
  sourceLabel?: string;
  sourceUrl?: string;
  solicitationNumber?: string;
  location?: string;
  venue?: string;
  city?: string;
  state?: string;
  eventDates?: string;
  setupDate?: string;
  strikeDate?: string;
  bidDeadline?: string;
  questionDeadline?: string;
  siteVisitDate?: string;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  contractTerm?: string;
  eventCount?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: LiveOpportunityStatus;
  tags: string[];
  rawText?: string;
  summary?: string;
  isPartnerSubcontract?: boolean;
  equipmentRequirements: LiveEquipmentRequirement[];
  crewRequirements: LiveCrewRequirement[];
  adminRequirements: LiveAdminRequirement[];
  equipmentMatches: LiveEquipmentMatchRow[];
  crewMatches: LiveCrewMatchRow[];
  ownedCoveragePct: number;
  equipmentMatchPct: number;
  crewMatchPct: number;
  fitScore: LiveFitScoreBreakdown;
  financialEstimate: LiveFinancialEstimate;
  travelClass?: LiveTravelClass;
  distanceMiles?: number | null;
  subRentalSummary?: string;
  noBidReason?: LiveNoBidReason | null;
  noBidNotes?: string;
  saved?: boolean;
  notes?: string;
  clientId?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiveProductionPartner = {
  id: string;
  organizationCompany: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  services: string[];
  equipmentOffered: string[];
  serviceRadiusMiles?: number;
  preferred?: boolean;
  rating?: number;
  notes?: string;
  insuranceOnFile?: boolean;
  w9OnFile?: boolean;
  createdAt: string;
  updatedAt: string;
};

export const LIVE_OPPORTUNITY_STATUSES: { value: LiveOpportunityStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "qualified", label: "Qualified" },
  { value: "pursuing", label: "Pursuing" },
  { value: "no_bid", label: "No Bid" },
  { value: "quote_building", label: "Quote Building" },
  { value: "proposal_submitted", label: "Proposal Submitted" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "expired", label: "Expired" },
];

export const LIVE_SOURCE_OPTIONS: { value: LiveOpportunitySourceKind; label: string }[] = [
  { value: "manual", label: "Manually entered" },
  { value: "paste_import", label: "Pasted text" },
  { value: "url_import", label: "URL import" },
  { value: "pdf_import", label: "PDF / RFP upload" },
  { value: "sam_gov", label: "SAM.gov" },
  { value: "nc_evp", label: "NC eVP / eProcurement" },
  { value: "state_procurement", label: "State procurement" },
  { value: "county_procurement", label: "County procurement" },
  { value: "city_procurement", label: "City / municipal" },
  { value: "university", label: "University" },
  { value: "venue", label: "Venue" },
  { value: "corporate", label: "Corporate" },
  { value: "church", label: "Church" },
  { value: "festival", label: "Festival" },
  { value: "partner_referral", label: "Partner referral" },
  { value: "partner_subcontract", label: "Partner / subcontract" },
  { value: "av_company", label: "AV company" },
  { value: "event_production_company", label: "Event production company" },
];

export const LIVE_NO_BID_REASONS: { value: LiveNoBidReason; label: string }[] = [
  { value: "outside_service_area", label: "Outside service area" },
  { value: "insufficient_equipment", label: "Insufficient equipment" },
  { value: "insufficient_crew", label: "Insufficient crew" },
  { value: "low_margin", label: "Low margin" },
  { value: "deadline_too_soon", label: "Deadline too soon" },
  { value: "insurance_requirement", label: "Insurance requirement" },
  { value: "certification_requirement", label: "Certification requirement" },
  { value: "too_complex", label: "Too complex" },
  { value: "conflict_with_existing_event", label: "Conflict with existing event" },
  { value: "strategic_mismatch", label: "Strategic mismatch" },
  { value: "other", label: "Other" },
];

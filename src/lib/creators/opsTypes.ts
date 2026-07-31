/**
 * Creator operations types — shortlists, campaigns, briefs, deliverables,
 * development plans, production days, and saved network searches (Phases 3–7).
 */

export const CREATOR_SHORTLISTS_COLLECTION = "creatorShortlists";
export const CREATOR_CAMPAIGNS_COLLECTION = "creatorCampaigns";
export const CREATOR_PRODUCTION_DAYS_COLLECTION = "creatorProductionDays";
export const CREATOR_SAVED_SEARCHES_COLLECTION = "creatorSavedSearches";

/** Network filter / saved-search shape. */
export interface CreatorNetworkFilters {
  q?: string;
  relationshipTypes?: string[];
  statuses?: string[];
  readinessStatuses?: string[];
  niches?: string[];
  location?: string;
  platforms?: string[];
  tags?: string[];
  availableOnly?: boolean;
  applicantsOnly?: boolean;
}

export interface CreatorSavedSearch {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  name: string;
  filters: CreatorNetworkFilters;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorNetworkSummary {
  totalActive: number;
  campaignReady: number;
  preferred: number;
  needsDevelopment: number;
  temporarilyUnavailable: number;
  openApplications: number;
  byRelationship: Record<string, number>;
  byReadiness: Record<string, number>;
  byNiche: Record<string, number>;
  totalFollowers: number;
  recentApplicants: { id: string; name: string; submittedAt?: string }[];
}

/** Shortlist entry with optional hold. */
export type CreatorShortlistEntryStatus =
  | "suggested"
  | "shortlisted"
  | "availability_requested"
  | "hold"
  | "confirmed"
  | "declined"
  | "removed";

export interface CreatorShortlistEntry {
  id: string;
  creatorId: string;
  creatorName: string;
  status: CreatorShortlistEntryStatus;
  matchScore?: number;
  matchReasons?: string[];
  holdUntil?: string;
  notes?: string;
  addedAt: string;
}

export interface CreatorShortlist {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  name: string;
  opportunityId?: string;
  campaignId?: string;
  brief?: string;
  requiredNiche?: string;
  requiredPlatforms?: string[];
  locationPreference?: string;
  entries: CreatorShortlistEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatorShortlistCreateInput {
  name: string;
  opportunityId?: string;
  campaignId?: string;
  brief?: string;
  requiredNiche?: string;
  requiredPlatforms?: string[];
  locationPreference?: string;
}

export type CreatorShortlistUpdateInput = Partial<
  Omit<CreatorShortlist, "id" | "organizationCompany" | "ownerUserId" | "createdAt" | "updatedAt">
>;

/** Match result from the creator_match agent / scorer. */
export interface CreatorMatchResult {
  creatorId: string;
  creatorName: string;
  score: number;
  reasons: string[];
  readinessStatus?: string;
  primaryNiche?: string;
  location?: string;
}

/** Creator-powered campaign (Business workspace) — can link a revenue campaign. */
export type CreatorCampaignStatus =
  | "draft"
  | "matching"
  | "proposed"
  | "agreed"
  | "in_production"
  | "posting"
  | "reporting"
  | "completed"
  | "cancelled";

export const CREATOR_CAMPAIGN_STATUS_LABELS: Record<CreatorCampaignStatus, string> = {
  draft: "Draft",
  matching: "Matching",
  proposed: "Proposed",
  agreed: "Agreed",
  in_production: "In production",
  posting: "Posting",
  reporting: "Reporting",
  completed: "Completed",
  cancelled: "Cancelled",
};

export interface CreatorCampaignAssignment {
  id: string;
  creatorId: string;
  creatorName: string;
  role?: string;
  compensation?: number;
  compensationNotes?: string;
  shortlistEntryId?: string;
  briefId?: string;
  status?: string;
  /** Stripe Connect transfer payout record */
  paidAt?: string;
  paidAmount?: number;
  stripeTransferId?: string;
  paidByUserId?: string;
  paidByDisplayName?: string;
}

export interface CreatorCampaignEconomics {
  clientRevenue?: number;
  creatorCompensationTotal?: number;
  directCosts?: number;
  estimatedMargin?: number;
  notes?: string;
}

export interface CreatorCampaignRights {
  usageSummary?: string;
  territory?: string;
  startDate?: string;
  endDate?: string;
  perpetual?: boolean;
  exclusivityCategory?: string;
  exclusivityEndDate?: string;
  paidMediaAllowed?: boolean;
  whitelistingAllowed?: boolean;
  notes?: string;
}

export interface CreatorBrief {
  id: string;
  creatorId: string;
  creatorName: string;
  campaignObjective?: string;
  creatorRole?: string;
  contentConcept?: string;
  keyMessage?: string;
  deliverablesSummary?: string;
  platform?: string;
  postingDate?: string;
  productionDate?: string;
  location?: string;
  wardrobe?: string;
  productRequirements?: string;
  talkingPoints?: string;
  requiredTags?: string[];
  requiredDisclosures?: string[];
  prohibitedStatements?: string[];
  brandSafetyRules?: string;
  approvalProcess?: string;
  revisionLimits?: string;
  usageRights?: string;
  exclusivity?: string;
  compensation?: string;
  pointOfContact?: string;
  deadlines?: string;
  status?: "draft" | "shared" | "acknowledged";
  updatedAt: string;
}

export type CreatorDeliverableStatus =
  | "planned"
  | "briefed"
  | "in_production"
  | "editing"
  | "creator_review"
  | "brand_review"
  | "revision_needed"
  | "approved"
  | "scheduled"
  | "posted"
  | "delivered"
  | "reporting_due"
  | "completed"
  | "cancelled";

export const CREATOR_DELIVERABLE_STATUS_LABELS: Record<CreatorDeliverableStatus, string> = {
  planned: "Planned",
  briefed: "Briefed",
  in_production: "In production",
  editing: "Editing",
  creator_review: "Creator review",
  brand_review: "Brand review",
  revision_needed: "Revision needed",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  delivered: "Delivered",
  reporting_due: "Reporting due",
  completed: "Completed",
  cancelled: "Cancelled",
};

export interface CreatorDeliverable {
  id: string;
  creatorId: string;
  creatorName: string;
  type: string;
  platform?: string;
  format?: string;
  dueDate?: string;
  postingDate?: string;
  status: CreatorDeliverableStatus;
  postedUrl?: string;
  notes?: string;
}

export interface CreatorCampaign {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  name: string;
  brandName?: string;
  objective?: string;
  status: CreatorCampaignStatus;
  revenueCampaignId?: string;
  opportunityId?: string;
  projectId?: string;
  shortlistId?: string;
  assignments: CreatorCampaignAssignment[];
  briefs: CreatorBrief[];
  deliverables: CreatorDeliverable[];
  economics?: CreatorCampaignEconomics;
  rights?: CreatorCampaignRights;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreatorCampaignCreateInput = {
  name: string;
  brandName?: string;
  objective?: string;
  status?: CreatorCampaignStatus;
  revenueCampaignId?: string;
  opportunityId?: string;
  shortlistId?: string;
  notes?: string;
};

export type CreatorCampaignUpdateInput = Partial<
  Omit<CreatorCampaign, "id" | "organizationCompany" | "ownerUserId" | "createdAt" | "updatedAt">
>;

/** Development plan item for incubator / needs-development creators. */
export type CreatorDevelopmentItemStatus = "planned" | "in_progress" | "done" | "blocked";

export interface CreatorDevelopmentItem {
  id: string;
  area: string;
  goal: string;
  currentGap?: string;
  recommendedAction?: string;
  owner?: string;
  dueDate?: string;
  status: CreatorDevelopmentItemStatus;
  evidence?: string;
}

export interface CreatorDevelopmentPlan {
  id: string;
  creatorId: string;
  title: string;
  items: CreatorDevelopmentItem[];
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

/** Shared studio day for multiple creators. */
export interface CreatorProductionDay {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  name: string;
  date: string;
  location?: string;
  theme?: string;
  capacity?: number;
  creatorIds: string[];
  notes?: string;
  status: "planned" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export type CreatorProductionDayCreateInput = {
  name: string;
  date: string;
  location?: string;
  theme?: string;
  capacity?: number;
  creatorIds?: string[];
  notes?: string;
};

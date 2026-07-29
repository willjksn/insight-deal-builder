import type {
  RevenueApprovalMode,
  RevenueCampaignStatus,
  RevenueCampaignType,
} from "@/lib/revenueOpportunities/types";

export interface ImgCampaignFields {
  industry?: string;
  subNiche?: string;
  city?: string;
  state?: string;
  radiusMiles?: number;
  serviceToPromote?: string;
  minimumProjectValue?: number;
  preferredBusinessSize?: string;
  geographicServiceability?: string;
  recurringContentPreference?: boolean;
  stormiIntegrationAllowed?: boolean;
  desiredCampaignType?: string;
  excludedCompanies?: string[];
  excludedBusinessTypes?: string[];
}

/**
 * Who this creator-brand mission is for.
 * - stormi_flagship: Stormi-led brand deals (classic track)
 * - network: IMG creator network (multi-creator / UGC / represented)
 * - specific: named creators on the roster (linkedCreatorIds)
 */
export type CreatorCampaignScope = "stormi_flagship" | "network" | "specific";

export interface StormiCampaignFields {
  brandCategory?: string;
  productType?: string;
  geographicPreference?: string;
  desiredPartnershipType?: string;
  minimumPartnershipValue?: number;
  audienceFitRequirements?: string;
  brandExclusions?: string[];
  preferredDeliverables?: string[];
  imgProductionInclusion?: boolean;
  usageRightsPreference?: string;
  witmeConversionObjective?: boolean;
  desiredCampaignTheme?: string;
  /** Creator-side scope — Stormi only, full network, or specific roster IDs. */
  creatorScope?: CreatorCampaignScope;
  /** When creatorScope is "specific", roster creator IDs to pitch. */
  linkedCreatorIds?: string[];
  /** Optional shortlist built from Creator Match. */
  shortlistId?: string;
}

export interface RevenueCampaign {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  campaignType: RevenueCampaignType;
  /** Optional link to a reusable business-development profile (spec Part 10-12). */
  profileId?: string;
  name: string;
  objective?: string;
  status: RevenueCampaignStatus;
  approvalMode: RevenueApprovalMode;
  opportunityCountRequested: number;
  minOpportunityScore: number;
  minConfidenceScore: number;
  dailyResearchLimit?: number;
  weeklyResearchLimit?: number;
  requiredSignals?: string[];
  exclusions?: string[];
  additionalInstructions?: string;
  schedule?: string;
  active: boolean;
  img?: ImgCampaignFields;
  stormi?: StormiCampaignFields;
  createdAt: string;
  updatedAt: string;
}

export type RevenueCampaignCreateInput = Omit<
  RevenueCampaign,
  "id" | "organizationCompany" | "ownerUserId" | "createdAt" | "updatedAt"
>;

export type RevenueCampaignUpdateInput = Partial<
  Omit<RevenueCampaign, "id" | "organizationCompany" | "ownerUserId" | "createdAt">
>;

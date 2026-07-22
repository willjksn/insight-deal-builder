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

export type RevenueCampaignRunStatus = "queued" | "running" | "completed" | "failed" | "partially_completed";

export interface RevenueCampaignRun {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  campaignId: string;
  campaignName: string;
  campaignType: "img_client" | "stormi_brand";
  status: RevenueCampaignRunStatus;
  agentRunId?: string;
  agentName?: string;
  opportunitiesRequested: number;
  opportunitiesCreated: number;
  opportunityIds: string[];
  searchQuery?: string;
  usedLiveSearch: boolean;
  usedLiveAi: boolean;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

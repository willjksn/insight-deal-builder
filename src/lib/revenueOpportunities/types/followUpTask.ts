export type RevenueFollowUpTaskStatus = "open" | "done" | "snoozed" | "cancelled";

export type RevenueFollowUpChannel = "email" | "call" | "social" | "other";

export type RevenueFollowUpTaskSource = "manual" | "agent" | "scan";

export interface RevenueFollowUpTask {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  opportunityId: string;
  opportunityName?: string;
  campaignId?: string;
  title: string;
  status: RevenueFollowUpTaskStatus;
  dueAt: string;
  channel: RevenueFollowUpChannel;
  notes?: string;
  angle?: string;
  draftMessage?: string;
  source: RevenueFollowUpTaskSource;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RevenueFollowUpTaskCreateInput = {
  opportunityId: string;
  opportunityName?: string;
  campaignId?: string;
  title: string;
  dueAt: string;
  channel?: RevenueFollowUpChannel;
  notes?: string;
  angle?: string;
  draftMessage?: string;
  source?: RevenueFollowUpTaskSource;
};

export type RevenueFollowUpTaskUpdateInput = Partial<{
  title: string;
  status: RevenueFollowUpTaskStatus;
  dueAt: string;
  channel: RevenueFollowUpChannel;
  notes: string;
  angle: string;
  draftMessage: string;
}>;

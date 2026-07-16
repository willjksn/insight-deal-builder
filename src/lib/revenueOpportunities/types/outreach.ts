export type RevenueOutreachChannel = "email" | "linkedin_dm" | "instagram_dm";

export type RevenueOutreachStatus = "draft" | "pending_review" | "approved" | "rejected" | "sent";

export interface RevenueOutreachActivity {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  opportunityId: string;
  opportunitySubjectName?: string;
  campaignId?: string;
  channel: RevenueOutreachChannel;
  status: RevenueOutreachStatus;
  subject?: string;
  body: string;
  recipientName?: string;
  recipientEmail?: string;
  agentRunId?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachDraftItem {
  channel: RevenueOutreachChannel;
  subject?: string;
  body: string;
  recipientName?: string;
  recipientEmail?: string;
}

export interface OutreachDraftBundle {
  drafts: OutreachDraftItem[];
}

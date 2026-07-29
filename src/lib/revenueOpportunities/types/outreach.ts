export type RevenueOutreachChannel = "email" | "linkedin_dm" | "instagram_dm";

export type RevenueOutreachStatus = "draft" | "pending_review" | "approved" | "rejected" | "sent";

export type RevenueOutreachSource = "opportunity" | "ai_writer";

export interface RevenueOutreachActivity {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  /** Present when drafted from an approved opportunity; omitted for AI Writer ad-hoc emails. */
  opportunityId?: string;
  opportunitySubjectName?: string;
  campaignId?: string;
  source?: RevenueOutreachSource;
  /** User brief that drove AI Writer (ad-hoc compose). */
  userBrief?: string;
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

export type AiWriterTone = "professional" | "warm" | "concise";

export interface AiWriterRequest {
  brief: string;
  toEmail?: string;
  toName?: string;
  subjectHint?: string;
  tone?: AiWriterTone;
  /** Optional: enrich the draft with opportunity context. */
  opportunityId?: string;
}

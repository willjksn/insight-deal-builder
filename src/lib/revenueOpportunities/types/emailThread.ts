export type RevenueEmailThreadStatus = "open" | "awaiting_reply" | "closed" | "archived";

export type RevenueEmailClassification =
  | "interested"
  | "question"
  | "not_interested"
  | "out_of_office"
  | "referral"
  | "scheduling"
  | "spam"
  | "unknown";

export interface RevenueEmailMessage {
  messageId: string;
  from: string;
  to?: string;
  subject: string;
  snippet: string;
  body?: string;
  receivedAt: string;
  isOutbound?: boolean;
}

export interface RevenueEmailThread {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  opportunityId?: string;
  outreachActivityId?: string;
  gmailThreadId: string;
  subject: string;
  participants: string[];
  status: RevenueEmailThreadStatus;
  classification?: RevenueEmailClassification;
  classificationSummary?: string;
  suggestedReply?: string;
  autopilotMode: "off" | "draft_only";
  lastMessageAt: string;
  messageCount: number;
  messages: RevenueEmailMessage[];
  agentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailClassificationResult {
  classification: RevenueEmailClassification;
  summary: string;
  suggestedReply?: string;
  confidenceScore: number;
}

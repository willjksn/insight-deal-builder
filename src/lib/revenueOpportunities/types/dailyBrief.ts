export type RevenueDailyBriefPriority = {
  id: string;
  label: string;
  href?: string;
  count?: number;
};

export type RevenueDailyBriefSource = "generated" | "n8n";

export interface RevenueDailyBrief {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  /** YYYY-MM-DD (UTC) */
  briefDate: string;
  headline: string;
  summary: string;
  priorities: RevenueDailyBriefPriority[];
  metrics: {
    awaitingReview: number;
    outreachReady: number;
    followUpsDue: number;
    openFollowUpTasks: number;
    proposalsPending: number;
    estimatedPipelineValue: number;
  };
  source: RevenueDailyBriefSource;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

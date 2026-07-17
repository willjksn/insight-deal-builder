export type RevenueProposalStatus = "draft" | "review" | "approved" | "sent" | "archived";

export interface AgreementProposalPrefill {
  suggestedTitle: string;
  projectOverview: string;
  deliverables: string[];
  estimatedFee?: number;
  paymentStructure?: string;
  scopeNotes?: string;
}

export interface RevenueOpportunityProposal {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  opportunityId: string;
  opportunitySubjectName?: string;
  discoverySessionId?: string;
  status: RevenueProposalStatus;
  title: string;
  executiveSummary: string;
  scopeOutline: string;
  deliverables: string[];
  timelineNotes?: string;
  investmentMin?: number;
  investmentMax?: number;
  paymentStructureSuggestion?: string;
  agreementPrefill?: AgreementProposalPrefill;
  agreementId?: string;
  agentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalDraftBundle {
  title: string;
  executiveSummary: string;
  scopeOutline: string;
  deliverables: string[];
  timelineNotes?: string;
  investmentMin?: number;
  investmentMax?: number;
  paymentStructureSuggestion?: string;
  agreementPrefill: AgreementProposalPrefill;
}

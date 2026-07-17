import type { AgentConfidence, AgentEvidence } from "@/lib/revenueOpportunities/types";

export type RevenueAgentRunStatus = "queued" | "running" | "completed" | "failed" | "needs_review";

export type RevenueAgentName =
  | "quality_review"
  | "revision"
  | "img_research"
  | "stormi_research"
  | "campaign_concept"
  | "outreach_draft"
  | "email_receptionist"
  | "discovery_prep"
  | "discovery_debrief"
  | "proposal_draft";

export interface RevenueAgentRun {
  id: string;
  agentName: RevenueAgentName;
  agentVersion: string;
  organizationCompany: string;
  ownerUserId: string;
  campaignId?: string;
  opportunityId?: string;
  status: RevenueAgentRunStatus;
  inputSummary?: string;
  output?: Record<string, unknown>;
  confidence?: AgentConfidence;
  evidence?: AgentEvidence[];
  model?: string;
  estimatedCostUsd?: number;
  durationMs?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RevenueAgentCatalogEntry {
  name: RevenueAgentName;
  version: string;
  label: string;
  description: string;
  phase: number;
  status: "stub" | "live" | "planned";
  tools: string[];
}

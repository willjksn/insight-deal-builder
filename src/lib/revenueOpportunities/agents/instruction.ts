import type { AgentConfidence, AgentEvidence } from "@/lib/revenueOpportunities/types";

/** Standard agent instruction envelope for all Revenue & Opportunities agents. */
export interface AgentInstruction<TInput> {
  agentName: string;
  version: string;
  role: string;
  goal: string;
  context: string;
  inputs: TInput;
  tools: string[];
  constraints: string[];
  process: string[];
  outputSchema: string;
  successCriteria: string[];
  failureConditions: string[];
  fallback: string[];
}

export interface AgentRunResult<TOutput> {
  agentName: string;
  version: string;
  output: TOutput;
  confidence: AgentConfidence;
  evidence: AgentEvidence[];
  model?: string;
  estimatedCostUsd?: number;
  durationMs?: number;
}

export interface AgentRunRecord {
  id: string;
  agentName: string;
  organizationCompany: string;
  campaignId?: string;
  opportunityId?: string;
  status: "completed" | "failed" | "needs_review";
  errorMessage?: string;
  createdAt: string;
}

/** Registry entry — implementation wired in Phase 3+. */
export interface AgentDefinition<TInput, TOutput> {
  name: string;
  version: string;
  instruction: Omit<AgentInstruction<TInput>, "inputs">;
  execute: (input: TInput) => Promise<AgentRunResult<TOutput>>;
}

export type AgentRegistry = Map<string, AgentDefinition<unknown, unknown>>;

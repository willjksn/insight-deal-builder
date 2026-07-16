import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { CampaignConceptSummary } from "@/lib/revenueOpportunities/types/opportunity";
import type { AgentEvidence } from "@/lib/revenueOpportunities/types";
import { runCampaignConceptPass } from "@/lib/revenueOpportunities/research/runConceptPass";

export interface CampaignConceptInput {
  opportunity: RevenueOpportunity;
}

export interface CampaignConceptOutput {
  campaignConcept: CampaignConceptSummary;
  evidence: AgentEvidence[];
  usedLiveSearch: boolean;
}

const AGENT_NAME = "campaign_concept";
const VERSION = "0.1.0";

export const campaignConceptAgent: AgentDefinition<CampaignConceptInput, CampaignConceptOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Campaign concept agent",
    goal: "Draft a high-level campaign concept for outreach and human review.",
    context: "Not scripts or shot lists — strategic creative direction only.",
    tools: ["tavily", "gemini"],
    constraints: ["No shot lists", "ShootSpine-compatible production scope"],
    process: ["Research subject", "Draft concept JSON", "Attach evidence"],
    outputSchema: "CampaignConceptOutput",
    successCriteria: ["Clear hook and deliverables", "Business value articulated"],
    failureConditions: ["Empty concept"],
    fallback: ["Template concept from existing opportunity data"],
  },
  async execute(input: CampaignConceptInput): Promise<AgentRunResult<CampaignConceptOutput>> {
    const pass = await runCampaignConceptPass(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: pass,
      confidence: {
        confidenceScore: pass.usedLiveSearch ? 80 : 60,
        confidenceReasons: pass.usedLiveSearch ? ["Live concept pass"] : ["Mock/template concept"],
        assumptions: [],
        missingInformation: [],
      },
      evidence: pass.evidence,
      model: pass.usedLiveSearch ? "gemini+tavily" : "mock",
      estimatedCostUsd: pass.usedLiveSearch ? 0.03 : 0,
    };
  },
};

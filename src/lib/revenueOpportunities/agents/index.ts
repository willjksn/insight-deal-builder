import { registerAgent } from "@/lib/revenueOpportunities/agents/registry";
import { qualityReviewAgent } from "@/lib/revenueOpportunities/agents/qualityReview";
import { revisionAgent } from "@/lib/revenueOpportunities/agents/revision";
import { imgResearchAgent } from "@/lib/revenueOpportunities/agents/imgResearch";
import { stormiResearchAgent } from "@/lib/revenueOpportunities/agents/stormiResearch";
import { campaignConceptAgent } from "@/lib/revenueOpportunities/agents/campaignConcept";

let initialized = false;

/** Register all Phase 3+ agents. Safe to call multiple times. */
export function initRevenueAgents(): void {
  if (initialized) return;
  registerAgent(qualityReviewAgent);
  registerAgent(revisionAgent);
  registerAgent(imgResearchAgent);
  registerAgent(stormiResearchAgent);
  registerAgent(campaignConceptAgent);
  initialized = true;
}

export { qualityReviewAgent, revisionAgent, imgResearchAgent, stormiResearchAgent, campaignConceptAgent };
export * from "@/lib/revenueOpportunities/agents/registry";

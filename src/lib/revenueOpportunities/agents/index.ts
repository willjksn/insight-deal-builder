import { registerAgent } from "@/lib/revenueOpportunities/agents/registry";
import { qualityReviewAgent } from "@/lib/revenueOpportunities/agents/qualityReview";
import { revisionAgent } from "@/lib/revenueOpportunities/agents/revision";

let initialized = false;

/** Register all Phase 3+ agents. Safe to call multiple times. */
export function initRevenueAgents(): void {
  if (initialized) return;
  registerAgent(qualityReviewAgent);
  registerAgent(revisionAgent);
  initialized = true;
}

export { qualityReviewAgent, revisionAgent };
export * from "@/lib/revenueOpportunities/agents/registry";

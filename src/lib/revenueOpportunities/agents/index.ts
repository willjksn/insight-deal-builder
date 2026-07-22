import { registerAgent } from "@/lib/revenueOpportunities/agents/registry";
import { qualityReviewAgent } from "@/lib/revenueOpportunities/agents/qualityReview";
import { revisionAgent } from "@/lib/revenueOpportunities/agents/revision";
import { imgResearchAgent } from "@/lib/revenueOpportunities/agents/imgResearch";
import { stormiResearchAgent } from "@/lib/revenueOpportunities/agents/stormiResearch";
import { campaignConceptAgent } from "@/lib/revenueOpportunities/agents/campaignConcept";
import { outreachDraftAgent } from "@/lib/revenueOpportunities/agents/outreachDraft";
import { emailReceptionistAgent } from "@/lib/revenueOpportunities/agents/emailReceptionist";
import { discoveryPrepAgent } from "@/lib/revenueOpportunities/agents/discoveryPrep";
import { discoveryDebriefAgent } from "@/lib/revenueOpportunities/agents/discoveryDebrief";
import { proposalDraftAgent } from "@/lib/revenueOpportunities/agents/proposalDraft";
import { verificationAgent } from "@/lib/revenueOpportunities/agents/verification";
import { contactFinderAgent } from "@/lib/revenueOpportunities/agents/contactFinder";

let initialized = false;

/** Register all Phase 3+ agents. Safe to call multiple times. */
export function initRevenueAgents(): void {
  if (initialized) return;
  registerAgent(qualityReviewAgent);
  registerAgent(revisionAgent);
  registerAgent(imgResearchAgent);
  registerAgent(stormiResearchAgent);
  registerAgent(campaignConceptAgent);
  registerAgent(outreachDraftAgent);
  registerAgent(emailReceptionistAgent);
  registerAgent(discoveryPrepAgent);
  registerAgent(discoveryDebriefAgent);
  registerAgent(proposalDraftAgent);
  registerAgent(verificationAgent);
  registerAgent(contactFinderAgent);
  initialized = true;
}

export {
  qualityReviewAgent,
  revisionAgent,
  imgResearchAgent,
  stormiResearchAgent,
  campaignConceptAgent,
  outreachDraftAgent,
  emailReceptionistAgent,
  discoveryPrepAgent,
  discoveryDebriefAgent,
  proposalDraftAgent,
  verificationAgent,
  contactFinderAgent,
};
export * from "@/lib/revenueOpportunities/agents/registry";

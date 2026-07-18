import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { RevenueOpportunityCreateInput } from "@/lib/revenueOpportunities/types/opportunity";
import type { ParsedResearchProspect } from "@/lib/revenueOpportunities/research/parseResearch";

export function prospectToOpportunityInput(
  prospect: ParsedResearchProspect,
  campaign: RevenueCampaign
): RevenueOpportunityCreateInput {
  const hasContact =
    Boolean(prospect.contact?.email) ||
    Boolean(prospect.contact?.name) ||
    Boolean(prospect.subject.publicEmail);

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    opportunityType: campaign.campaignType,
    subject: prospect.subject,
    contact: prospect.contact,
    research: prospect.research,
    evidence: prospect.evidence,
    scoring: prospect.scoring,
    confidence: {
      confidenceScore: prospect.scoring.confidenceScore,
      confidenceReasons: prospect.scoreReasons ?? ["Research agent scoring"],
      assumptions: prospect.evidence.length ? [] : ["Limited evidence in research pass"],
      missingInformation: hasContact ? [] : ["Decision-maker contact not verified"],
    },
    recommendation: {
      serviceName: campaign.img?.serviceToPromote ?? "Business Brand Package",
      estimatedMinimumValue: campaign.img?.minimumProjectValue ?? 3500,
      estimatedMaximumValue: Math.round((campaign.img?.minimumProjectValue ?? 3500) * 2),
      rationale: prospect.scoreReasons?.[0] ?? "Qualified by research scoring model",
    },
    campaignConcept: prospect.campaignConcept,
    workflow: {
      pipelineStage: "review_required",
      technicalStatus: "completed",
      approvalStatus: "pending",
      nextAction: "Review researched opportunity",
    },
  };
}

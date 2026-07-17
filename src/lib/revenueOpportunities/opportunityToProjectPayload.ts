import { FieldValue } from "firebase-admin/firestore";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { stripUndefined } from "@/lib/firebase/firestore";
import type { Project } from "@/lib/types";

export function estimateProjectFee(
  opportunity: RevenueOpportunity,
  proposal?: RevenueOpportunityProposal
): number {
  if (proposal?.agreementPrefill?.estimatedFee) {
    return proposal.agreementPrefill.estimatedFee;
  }
  if (proposal?.investmentMin != null && proposal?.investmentMax != null) {
    return Math.round((proposal.investmentMin + proposal.investmentMax) / 2);
  }
  if (proposal?.investmentMin != null) return proposal.investmentMin;
  if (proposal?.investmentMax != null) return proposal.investmentMax;
  return opportunity.recommendation?.estimatedMinimumValue ?? 0;
}

export function defaultProjectName(
  opportunity: RevenueOpportunity,
  proposal?: RevenueOpportunityProposal,
  override?: string
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  if (proposal?.title?.trim()) return proposal.title.trim();
  const concept = opportunity.campaignConcept?.title?.trim();
  if (concept) return `${opportunity.subject.name} — ${concept}`;
  return opportunity.subject.name;
}

export function opportunityLocation(opportunity: RevenueOpportunity): string {
  const { subject } = opportunity;
  return [subject.city, subject.state].filter(Boolean).join(", ") || subject.address?.trim() || "";
}

/** Build Firestore project document from a won revenue opportunity. */
export function opportunityToProjectPayload(params: {
  opportunity: RevenueOpportunity;
  proposal?: RevenueOpportunityProposal;
  projectName?: string;
  ownerUserId: string;
}): Record<string, unknown> {
  const { opportunity, proposal, projectName, ownerUserId } = params;
  return stripUndefined({
    projectName: defaultProjectName(opportunity, proposal, projectName),
    clientId: opportunity.clientId ?? "",
    clientName: opportunity.subject.name,
    agreementType: "client_project" as const,
    projectType: "Business Brand Package" as Project["projectType"],
    shootType: "Photo + Video" as Project["shootType"],
    totalProjectFee: estimateProjectFee(opportunity, proposal),
    shootDate: "",
    deliveryDate: "",
    location: opportunityLocation(opportunity),
    status: "draft" as const,
    ownerUserId,
    sourceRevenueOpportunity: true,
    sourceRevenueOpportunityId: opportunity.id,
    ...(proposal?.id ? { sourceRevenueProposalId: proposal.id } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

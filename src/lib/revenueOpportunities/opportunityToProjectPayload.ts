import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { stripUndefined } from "@/lib/firebase/firestore";
import type { Project, ProjectType, ShootType } from "@/lib/types";

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

/** Infer ShootSpine project package type from opportunity + proposal signals. */
export function inferProjectType(
  opportunity: RevenueOpportunity,
  proposal?: RevenueOpportunityProposal
): ProjectType {
  if (opportunity.opportunityType === "stormi_brand") {
    return "Creator-Led Brand Campaign";
  }
  const blob = [
    opportunity.recommendation?.serviceName,
    opportunity.recommendation?.serviceId,
    opportunity.campaignConcept?.title,
    opportunity.campaignConcept?.campaignObjective,
    proposal?.title,
    proposal?.scopeOutline,
    ...(opportunity.campaignConcept?.recommendedDeliverables ?? []),
    ...(proposal?.deliverables ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\breel\b|short-form|tiktok|reels?\b/.test(blob)) return "Business Reel Package";
  if (/\bpodcast\b/.test(blob)) return "Podcast Shoot";
  if (/\binterview\b|talking.?head/.test(blob)) return "Interview";
  if (/\bevent\b|coverage\b/.test(blob)) return "Event Coverage";
  if (/real.?estate|location promo|property/.test(blob)) return "Real Estate / Location Promo";
  if (/\bmusic.?video\b|\bmv\b/.test(blob)) return "Music Video";
  if (/\bdocumentary\b/.test(blob)) return "Documentary";
  if (/\bshort.?film\b/.test(blob)) return "Short Film";
  if (/\bcommercial\b|spot\b/.test(blob)) return "Commercial";
  if (/retainer|always.?on|monthly content/.test(blob)) return "Social Media Retainer";
  if (/premium|brand campaign|flagship/.test(blob)) return "Premium Brand Campaign";
  return "Business Brand Package";
}

/** Infer shoot modality from concept / deliverables. */
export function inferShootType(
  opportunity: RevenueOpportunity,
  proposal?: RevenueOpportunityProposal
): ShootType {
  if (opportunity.opportunityType === "stormi_brand") {
    return "Creator Lifestyle";
  }
  const blob = [
    opportunity.recommendation?.serviceName,
    opportunity.campaignConcept?.title,
    opportunity.campaignConcept?.storyDirection,
    ...(opportunity.campaignConcept?.recommendedDeliverables ?? []),
    ...(proposal?.deliverables ?? []),
    proposal?.scopeOutline,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bpodcast\b|multi.?cam/.test(blob)) return "Podcast / Multi-Cam";
  if (/\binterview\b|talking.?head/.test(blob)) return "Interview / Talking Head";
  if (/\bevent\b/.test(blob)) return "Event";
  if (/\bphoto.?only\b|stills only|photography only/.test(blob)) return "Photo Only";
  if (/\bvideo.?only\b|film only/.test(blob)) return "Video Only";
  if (/cinematic|commercial spot|hero film/.test(blob)) return "Cinematic Commercial";
  if (/brand campaign|campaign package/.test(blob)) return "Brand Campaign";
  if (/\bphoto\b/.test(blob) && /\bvideo\b|\breel\b|\bfilm\b/.test(blob)) {
    return "Photo + Video";
  }
  return "Photo + Video";
}

const ISO_DATE = /\b(20\d{2}-\d{2}-\d{2})\b/g;

/**
 * Pull shoot / delivery dates from free-text timeline notes.
 * First date → shoot; second (if any) → delivery; "delivery|due|deadline" line preferred for delivery.
 */
export function extractTimelineDates(timelineNotes?: string): {
  shootDate?: string;
  deliveryDate?: string;
} {
  const text = timelineNotes?.trim();
  if (!text) return {};
  const dates = [...text.matchAll(ISO_DATE)].map((m) => m[1]);
  if (!dates.length) return {};

  const lines = text.split(/\n+/);
  let deliveryDate: string | undefined;
  for (const line of lines) {
    if (/deliver|due|deadline|handoff|final/i.test(line)) {
      const m = line.match(ISO_DATE);
      if (m?.[1]) {
        deliveryDate = m[1];
        break;
      }
    }
  }

  const shootDate = dates[0];
  if (!deliveryDate && dates.length > 1) deliveryDate = dates[1];
  if (deliveryDate && deliveryDate === shootDate && dates.length > 1) {
    deliveryDate = dates[1];
  }
  return stripUndefined({ shootDate, deliveryDate });
}

/** Human-readable brief for Prep filming notes (no re-entry). */
export function buildRevenueHandoffNotes(
  opportunity: RevenueOpportunity,
  proposal?: RevenueOpportunityProposal
): string {
  const concept = opportunity.campaignConcept;
  const prefill = proposal?.agreementPrefill;
  const sections: string[] = ["## From revenue opportunity", ""];

  const overview =
    prefill?.projectOverview?.trim() ||
    proposal?.executiveSummary?.trim() ||
    concept?.coreConcept?.trim() ||
    concept?.campaignObjective?.trim();
  if (overview) {
    sections.push("### Overview", overview, "");
  }

  const scope =
    prefill?.scopeNotes?.trim() ||
    proposal?.scopeOutline?.trim() ||
    concept?.storyDirection?.trim();
  if (scope) {
    sections.push("### Scope", scope, "");
  }

  const deliverables =
    prefill?.deliverables?.length
      ? prefill.deliverables
      : proposal?.deliverables?.length
        ? proposal.deliverables
        : concept?.recommendedDeliverables ?? [];
  if (deliverables.length) {
    sections.push("### Deliverables", ...deliverables.map((d) => `- ${d}`), "");
  }

  if (proposal?.timelineNotes?.trim()) {
    sections.push("### Timeline", proposal.timelineNotes.trim(), "");
  }

  if (concept?.targetAudience?.trim()) {
    sections.push("### Audience", concept.targetAudience.trim(), "");
  }
  if (concept?.hook?.trim()) {
    sections.push("### Hook", concept.hook.trim(), "");
  }
  if (concept?.budgetConsiderations?.length) {
    sections.push(
      "### Budget notes",
      ...concept.budgetConsiderations.map((b) => `- ${b}`),
      ""
    );
  }
  if (concept?.knownConstraints?.length) {
    sections.push(
      "### Constraints",
      ...concept.knownConstraints.map((c) => `- ${c}`),
      ""
    );
  }
  if (concept?.shootSpineProjectNotes?.length) {
    sections.push(
      "### Production notes",
      ...concept.shootSpineProjectNotes.map((n) => `- ${n}`),
      ""
    );
  }

  const contactBits = [
    opportunity.contact?.name,
    opportunity.contact?.title,
    opportunity.contact?.email,
    opportunity.contact?.phone,
  ].filter(Boolean);
  if (contactBits.length) {
    sections.push("### Client contact", contactBits.join(" · "), "");
  }

  sections.push(
    `Opportunity: ${opportunity.id}`,
    opportunity.campaignName ? `Campaign: ${opportunity.campaignName}` : ""
  );

  return sections.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n").trim();
}

export function buildScopeChecklistNotes(
  opportunity: RevenueOpportunity,
  proposal?: RevenueOpportunityProposal
): string {
  const fee = estimateProjectFee(opportunity, proposal);
  const dates = extractTimelineDates(proposal?.timelineNotes);
  const deliverables =
    proposal?.agreementPrefill?.deliverables?.length
      ? proposal.agreementPrefill.deliverables
      : proposal?.deliverables?.length
        ? proposal.deliverables
        : opportunity.campaignConcept?.recommendedDeliverables ?? [];
  const parts = [
    fee > 0 ? `Fee ~$${fee.toLocaleString()}` : null,
    dates.shootDate ? `Shoot ${dates.shootDate}` : null,
    dates.deliveryDate ? `Delivery ${dates.deliveryDate}` : null,
    deliverables.length ? `Deliverables: ${deliverables.join("; ")}` : null,
    proposal?.paymentStructureSuggestion ||
      proposal?.agreementPrefill?.paymentStructure ||
      null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Build Firestore project document from a won revenue opportunity. */
export function opportunityToProjectPayload(params: {
  opportunity: RevenueOpportunity;
  proposal?: RevenueOpportunityProposal;
  projectName?: string;
  ownerUserId: string;
}): Record<string, unknown> {
  const { opportunity, proposal, projectName, ownerUserId } = params;
  const dates = extractTimelineDates(proposal?.timelineNotes);
  return stripUndefined({
    projectName: defaultProjectName(opportunity, proposal, projectName),
    clientId: opportunity.clientId ?? "",
    clientName: opportunity.subject.name,
    agreementType: "client_project" as const,
    projectType: inferProjectType(opportunity, proposal),
    shootType: inferShootType(opportunity, proposal),
    totalProjectFee: estimateProjectFee(opportunity, proposal),
    shootDate: dates.shootDate ?? "",
    deliveryDate: dates.deliveryDate ?? "",
    location: opportunityLocation(opportunity),
    status: "draft" as const,
    ownerUserId,
    sourceRevenueOpportunity: true,
    sourceRevenueOpportunityId: opportunity.id,
    ...(proposal?.id ? { sourceRevenueProposalId: proposal.id } : {}),
  });
}

/** Fields safe to backfill on a project created by a prior thin conversion. */
export function opportunityToProjectBackfill(params: {
  opportunity: RevenueOpportunity;
  proposal?: RevenueOpportunityProposal;
  projectName?: string;
  existing: Partial<Project>;
}): Record<string, unknown> {
  const { opportunity, proposal, projectName, existing } = params;
  const dates = extractTimelineDates(proposal?.timelineNotes);
  const patch: Record<string, unknown> = {};
  if (!existing.projectName?.trim() && projectName?.trim()) {
    patch.projectName = defaultProjectName(opportunity, proposal, projectName);
  }
  if (!existing.clientId && opportunity.clientId) patch.clientId = opportunity.clientId;
  if (!existing.clientName?.trim()) patch.clientName = opportunity.subject.name;
  if (!existing.totalProjectFee) {
    patch.totalProjectFee = estimateProjectFee(opportunity, proposal);
  }
  if (!existing.shootDate?.trim() && dates.shootDate) patch.shootDate = dates.shootDate;
  if (!existing.deliveryDate?.trim() && dates.deliveryDate) {
    patch.deliveryDate = dates.deliveryDate;
  }
  if (!existing.location?.trim()) {
    const loc = opportunityLocation(opportunity);
    if (loc) patch.location = loc;
  }
  // Always refresh inferred types when still on the old hard-coded defaults.
  if (
    !existing.projectType ||
    existing.projectType === "Business Brand Package"
  ) {
    patch.projectType = inferProjectType(opportunity, proposal);
  }
  if (!existing.shootType || existing.shootType === "Photo + Video") {
    patch.shootType = inferShootType(opportunity, proposal);
  }
  if (proposal?.id && !existing.sourceRevenueProposalId) {
    patch.sourceRevenueProposalId = proposal.id;
  }
  return stripUndefined(patch);
}

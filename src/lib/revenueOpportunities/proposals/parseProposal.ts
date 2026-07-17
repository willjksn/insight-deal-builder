import type { AgreementProposalPrefill, ProposalDraftBundle } from "@/lib/revenueOpportunities/types/proposal";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { DiscoveryDebrief } from "@/lib/revenueOpportunities/types/discovery";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter(Boolean) as string[];
}

function num(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return v;
}

function parsePrefill(raw: unknown): AgreementProposalPrefill | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const suggestedTitle = str(o.suggestedTitle);
  const projectOverview = str(o.projectOverview);
  if (!suggestedTitle || !projectOverview) return null;
  const prefill: AgreementProposalPrefill = {
    suggestedTitle,
    projectOverview,
    deliverables: strList(o.deliverables),
  };
  const fee = num(o.estimatedFee);
  const paymentStructure = str(o.paymentStructure);
  const scopeNotes = str(o.scopeNotes);
  if (fee !== undefined) prefill.estimatedFee = fee;
  if (paymentStructure) prefill.paymentStructure = paymentStructure;
  if (scopeNotes) prefill.scopeNotes = scopeNotes;
  return prefill;
}

export function parseProposalDraft(raw: unknown): ProposalDraftBundle | null {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const title = str(o.title);
  const executiveSummary = str(o.executiveSummary);
  const scopeOutline = str(o.scopeOutline);
  const agreementPrefill = parsePrefill(o.agreementPrefill);
  if (!title || !executiveSummary || !scopeOutline || !agreementPrefill) return null;
  const bundle: ProposalDraftBundle = {
    title,
    executiveSummary,
    scopeOutline,
    deliverables: strList(o.deliverables),
    agreementPrefill,
  };
  const timelineNotes = str(o.timelineNotes);
  const investmentMin = num(o.investmentMin);
  const investmentMax = num(o.investmentMax);
  const paymentStructureSuggestion = str(o.paymentStructureSuggestion);
  if (timelineNotes) bundle.timelineNotes = timelineNotes;
  if (investmentMin !== undefined) bundle.investmentMin = investmentMin;
  if (investmentMax !== undefined) bundle.investmentMax = investmentMax;
  if (paymentStructureSuggestion) bundle.paymentStructureSuggestion = paymentStructureSuggestion;
  return bundle;
}

export function mockProposalDraft(
  opportunity: RevenueOpportunity,
  debrief?: DiscoveryDebrief
): ProposalDraftBundle {
  const name = opportunity.subject.name;
  const concept = opportunity.campaignConcept?.title ?? "Cinematic brand refresh";
  const min = opportunity.recommendation?.estimatedMinimumValue ?? 8500;
  const max = opportunity.recommendation?.estimatedMaximumValue ?? min * 1.6;
  const deliverables = opportunity.campaignConcept?.recommendedDeliverables?.slice(0, 4) ?? [
    "Hero brand film (60–90 sec)",
    "Social cut-downs (9:16 + 1:1)",
    "Production stills for web & social",
  ];
  const overview = debrief?.creativeMessage
    ? `${concept} for ${name}. ${debrief.creativeMessage}`
    : debrief?.summary
      ? `${concept} for ${name}. ${debrief.summary}`
      : `${concept} tailored for ${name} — cinematic photo and video to elevate brand presence across web and social.`;

  return {
    title: `${concept} — ${name}`,
    executiveSummary: overview,
    scopeOutline:
      "Pre-production planning, single-day cinematic capture, professional color grade, and delivery of hero film plus platform-ready cut-downs.",
    deliverables,
    timelineNotes: debrief?.timelineSignals ?? "Typical 3–4 week turnaround from signed agreement to final delivery.",
    investmentMin: Math.round(min),
    investmentMax: Math.round(max),
    paymentStructureSuggestion: "50% deposit / 50% before delivery",
    agreementPrefill: {
      suggestedTitle: `${name} — ${concept}`,
      projectOverview: overview,
      deliverables,
      estimatedFee: Math.round((min + max) / 2),
      paymentStructure: "50% deposit / 50% before delivery",
      ...(debrief?.proposalRecommendation ? { scopeNotes: debrief.proposalRecommendation } : {}),
    },
  };
}

import type { RevenueCampaignCreateInput } from "@/lib/revenueOpportunities/types/campaign";
import type { RevenueOpportunityCreateInput } from "@/lib/revenueOpportunities/types/opportunity";

function str(v: unknown, required = false): string | undefined {
  if (typeof v !== "string") return required ? "" : undefined;
  const t = v.trim();
  if (!t && required) return "";
  return t || undefined;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function validateCampaignCreate(body: unknown): RevenueCampaignCreateInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name, true);
  if (!name) throw new Error("Campaign name is required");

  const campaignType = b.campaignType === "stormi_brand" ? "stormi_brand" : "img_client";
  const status = typeof b.status === "string" ? b.status : "draft";
  const approvalMode = b.approvalMode === "auto_prepare" ? "auto_prepare" : "manual_review";

  return {
    campaignType,
    name,
    objective: str(b.objective),
    status: status as RevenueCampaignCreateInput["status"],
    approvalMode,
    opportunityCountRequested: Math.min(50, Math.max(1, num(b.opportunityCountRequested, 10))),
    minOpportunityScore: Math.min(100, Math.max(0, num(b.minOpportunityScore, 70))),
    minConfidenceScore: Math.min(100, Math.max(0, num(b.minConfidenceScore, 60))),
    dailyResearchLimit: b.dailyResearchLimit != null ? num(b.dailyResearchLimit, 5) : undefined,
    weeklyResearchLimit: b.weeklyResearchLimit != null ? num(b.weeklyResearchLimit, 25) : undefined,
    requiredSignals: Array.isArray(b.requiredSignals)
      ? b.requiredSignals.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : undefined,
    exclusions: Array.isArray(b.exclusions)
      ? b.exclusions.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : undefined,
    additionalInstructions: str(b.additionalInstructions),
    schedule: str(b.schedule),
    active: b.active !== false,
    img: campaignType === "img_client" && b.img && typeof b.img === "object" ? (b.img as RevenueCampaignCreateInput["img"]) : undefined,
    stormi:
      campaignType === "stormi_brand" && b.stormi && typeof b.stormi === "object"
        ? (b.stormi as RevenueCampaignCreateInput["stormi"])
        : undefined,
  };
}

export function validateOpportunityCreate(body: unknown): RevenueOpportunityCreateInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const subjectRaw = b.subject && typeof b.subject === "object" ? (b.subject as Record<string, unknown>) : {};
  const subjectName = str(subjectRaw.name, true);
  if (!subjectName) throw new Error("Subject name is required");

  const opportunityType = b.opportunityType === "stormi_brand" ? "stormi_brand" : "img_client";

  return {
    campaignId: str(b.campaignId),
    campaignName: str(b.campaignName),
    opportunityType,
    clientId: str(b.clientId),
    subject: {
      name: subjectName,
      website: str(subjectRaw.website),
      description: str(subjectRaw.description),
      industry: str(subjectRaw.industry),
      subIndustry: str(subjectRaw.subIndustry),
      city: str(subjectRaw.city),
      state: str(subjectRaw.state),
      address: str(subjectRaw.address),
      distanceMiles: subjectRaw.distanceMiles != null ? num(subjectRaw.distanceMiles, 0) : undefined,
      publicPhone: str(subjectRaw.publicPhone),
      publicEmail: str(subjectRaw.publicEmail),
      socialLinks: str(subjectRaw.socialLinks),
    },
    contact:
      b.contact && typeof b.contact === "object" ? (b.contact as RevenueOpportunityCreateInput["contact"]) : undefined,
    research:
      b.research && typeof b.research === "object"
        ? (b.research as RevenueOpportunityCreateInput["research"])
        : undefined,
    evidence: Array.isArray(b.evidence) ? (b.evidence as RevenueOpportunityCreateInput["evidence"]) : undefined,
    scoring:
      b.scoring && typeof b.scoring === "object"
        ? (b.scoring as RevenueOpportunityCreateInput["scoring"])
        : undefined,
    recommendation:
      b.recommendation && typeof b.recommendation === "object"
        ? (b.recommendation as RevenueOpportunityCreateInput["recommendation"])
        : undefined,
    campaignConcept:
      b.campaignConcept && typeof b.campaignConcept === "object"
        ? (b.campaignConcept as RevenueOpportunityCreateInput["campaignConcept"])
        : undefined,
    workflow: {
      pipelineStage:
        (typeof b.pipelineStage === "string"
          ? b.pipelineStage
          : "review_required") as RevenueOpportunityCreateInput["workflow"]["pipelineStage"],
      technicalStatus: "completed",
      approvalStatus: "pending",
      assignedTo: str(b.assignedTo),
      nextAction: str(b.nextAction) ?? "Review opportunity",
      followUpAt: str(b.followUpAt),
    },
  };
}

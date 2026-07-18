import type { AgentEvidence } from "@/lib/revenueOpportunities/types";
import type {
  CampaignConceptSummary,
  OpportunityContact,
  OpportunitySubject,
} from "@/lib/revenueOpportunities/types/opportunity";
import { calculateImgOpportunityScore } from "@/lib/revenueOpportunities/scoring/imgScoring";

export interface ParsedResearchProspect {
  subject: OpportunitySubject;
  contact?: OpportunityContact;
  research?: {
    observedFacts?: string[];
    marketingGaps?: string[];
    whyNowSignals?: string[];
    risks?: string[];
  };
  categoryScores: Record<string, number>;
  scoreReasons?: string[];
  campaignConcept?: CampaignConceptSummary;
  evidence: AgentEvidence[];
  scoring: { totalScore: number; confidenceScore: number; categoryScores: Record<string, number>; scoreReasons?: string[] };
}

const SCHEMA_PLACEHOLDER =
  /^(string(\s+optional)?|string\s*\(required\)|number|boolean|max\s+\d+|from research|must match|0-?\d+|low\|medium\|high)$/i;

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t || SCHEMA_PLACEHOLDER.test(t)) return undefined;
  return t;
}

function websiteUrl(v: unknown): string | undefined {
  const t = str(v);
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t)) return `https://${t}`;
  return undefined;
}

function socialLinksText(v: unknown): string | undefined {
  if (typeof v === "string") {
    const t = str(v);
    return t;
  }
  if (Array.isArray(v)) {
    const lines = v
      .map((item) => {
        if (typeof item === "string") return str(item);
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const platform = str(o.platform) ?? str(o.name);
          const handle = str(o.handle) ?? str(o.url) ?? str(o.value);
          if (platform && handle) return `${platform}: ${handle}`;
          return handle;
        }
        return undefined;
      })
      .filter((x): x is string => Boolean(x));
    return lines.length ? lines.join("\n") : undefined;
  }
  if (v && typeof v === "object") {
    const lines = Object.entries(v as Record<string, unknown>)
      .map(([platform, handle]) => {
        const h = str(handle);
        if (!h) return undefined;
        const p = str(platform);
        return p ? `${p}: ${h}` : h;
      })
      .filter((x): x is string => Boolean(x));
    return lines.length ? lines.join("\n") : undefined;
  }
  return undefined;
}

function strArray(v: unknown, max = 10): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseEvidence(raw: unknown): AgentEvidence[] {
  if (!Array.isArray(raw)) return [];
  const now = new Date().toISOString();
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    const claim = str(o.claim);
    const sourceUrl = str(o.sourceUrl);
    if (!claim || !sourceUrl) return [];
    return [
      {
        claim,
        sourceUrl,
        sourceTitle: str(o.sourceTitle),
        sourceType: str(o.sourceType) ?? "website",
        retrievedAt: now,
        confidence: Math.min(1, Math.max(0, num(o.confidence, 0.7))),
      },
    ];
  });
}

function emailStr(v: unknown): string | undefined {
  const t = str(v);
  if (!t) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return undefined;
  return t;
}

function parseSubject(raw: unknown): OpportunitySubject | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = str(o.name);
  if (!name) return null;
  return {
    name,
    website: websiteUrl(o.website),
    socialLinks: socialLinksText(o.socialLinks),
    description: str(o.description),
    industry: str(o.industry),
    city: str(o.city),
    state: str(o.state),
    publicEmail: emailStr(o.publicEmail),
    publicPhone: str(o.publicPhone),
  };
}

function parseContact(raw: unknown): OpportunityContact | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = str(o.name);
  const title = str(o.title);
  const email = emailStr(o.email);
  const phone = str(o.phone);
  const sourceUrl = websiteUrl(o.sourceUrl) ?? str(o.sourceUrl);
  if (!name && !email && !phone && !title) return undefined;
  return {
    name,
    title,
    email,
    phone,
    sourceUrl,
    verificationStatus: "unverified",
  };
}

function parseConcept(raw: unknown): CampaignConceptSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const title = str(o.title);
  const coreConcept = str(o.coreConcept);
  if (!title && !coreConcept) return undefined;
  const complexity = str(o.estimatedComplexity);
  return {
    title,
    campaignObjective: str(o.campaignObjective),
    targetAudience: str(o.targetAudience),
    coreConcept,
    hook: str(o.hook),
    storyDirection: str(o.storyDirection),
    recommendedDeliverables: strArray(o.recommendedDeliverables, 6),
    recommendedPlatforms: strArray(o.recommendedPlatforms, 5),
    stormiRole: str(o.stormiRole),
    imgRole: str(o.imgRole),
    businessValue: str(o.businessValue),
    creatorValue: str(o.creatorValue),
    estimatedComplexity:
      complexity === "low" || complexity === "medium" || complexity === "high" ? complexity : undefined,
    estimatedProductionDays: o.estimatedProductionDays != null ? num(o.estimatedProductionDays, 1) : undefined,
    budgetConsiderations: strArray(o.budgetConsiderations, 4),
    risks: strArray(o.risks, 4),
  };
}

export function parseResearchProspects(raw: unknown): ParsedResearchProspect[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(root.prospects) ? root.prospects : [];
  const out: ParsedResearchProspect[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const subject = parseSubject(o.subject);
    if (!subject) continue;

    const categoryScores =
      o.categoryScores && typeof o.categoryScores === "object"
        ? Object.fromEntries(
            Object.entries(o.categoryScores as Record<string, unknown>).map(([k, v]) => [k, num(v, 0)])
          )
        : {};

    const { totalScore, categoryScores: normalized } = calculateImgOpportunityScore(categoryScores);
    const evidence = parseEvidence(o.evidence);
    const scoreReasons = strArray(o.scoreReasons, 5);

    out.push({
      subject,
      contact: parseContact(o.contact),
      research:
        o.research && typeof o.research === "object"
          ? {
              observedFacts: strArray((o.research as Record<string, unknown>).observedFacts, 5),
              marketingGaps: strArray((o.research as Record<string, unknown>).marketingGaps, 4),
              whyNowSignals: strArray((o.research as Record<string, unknown>).whyNowSignals, 3),
              risks: strArray((o.research as Record<string, unknown>).risks, 2),
            }
          : undefined,
      categoryScores: normalized,
      scoreReasons,
      campaignConcept: parseConcept(o.campaignConcept),
      evidence,
      scoring: {
        totalScore,
        confidenceScore: Math.min(95, Math.max(40, totalScore - (evidence.length === 0 ? 15 : 5))),
        categoryScores: normalized,
        scoreReasons,
      },
    });
  }

  return out.sort((a, b) => b.scoring.totalScore - a.scoring.totalScore);
}

export function parseCampaignConceptResponse(raw: unknown): {
  campaignConcept?: CampaignConceptSummary;
  evidence: AgentEvidence[];
} {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    campaignConcept: parseConcept(root.campaignConcept),
    evidence: parseEvidence(root.evidence),
  };
}

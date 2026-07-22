import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilySearch, formatTavilyResultsForPrompt } from "@/lib/search/tavilyClient";
import type {
  OpportunityContact,
  OpportunityContactSuggestion,
  RevenueOpportunity,
} from "@/lib/revenueOpportunities/types/opportunity";

export const CONTACT_FINDER_SYSTEM = `You find the best decision-maker contact for a business from web research, for B2B outreach.

Return JSON only:
{
  "contact": {
    "name": "person if found or omit",
    "title": "role if found or omit",
    "email": "only if it appears in the sources",
    "phone": "only if it appears in the sources",
    "sourceUrl": "page where the contact was found"
  },
  "rationale": "one sentence on why this is the right contact",
  "confidence": 0.0
}

Rules:
- ONLY use contact details that appear in the provided sources. NEVER invent or guess emails, phones, or names.
- Prefer an owner, founder, marketing lead, or partnerships contact over a generic info@ address.
- If no real contact is found, return {"contact": {}, "confidence": 0}.
- confidence is 0-1.`;

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function emailStr(v: unknown): string | undefined {
  const t = cleanStr(v);
  if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return undefined;
  return t;
}

function hasAnyContactDetail(c: OpportunityContact): boolean {
  return Boolean(c.name || c.title || c.email || c.phone);
}

/** Rule-based suggestion from already-known public details (mock + fallback). */
export function computeRuleContactSuggestion(
  opportunity: RevenueOpportunity
): OpportunityContactSuggestion | null {
  const email = opportunity.subject.publicEmail;
  const phone = opportunity.subject.publicPhone;
  if (!email && !phone) return null;

  // Don't re-suggest what the opportunity already has verified.
  if (
    opportunity.contact?.verificationStatus === "verified" &&
    (opportunity.contact.email || opportunity.contact.phone)
  ) {
    return null;
  }

  return {
    contact: {
      name: opportunity.contact?.name,
      title: opportunity.contact?.title,
      email,
      phone,
      sourceUrl: opportunity.subject.website,
      verificationStatus: "unverified",
    },
    rationale: "Derived from the subject's public contact details.",
    confidence: 0.4,
    status: "pending",
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateContactSuggestion(opportunity: RevenueOpportunity): Promise<{
  suggestion: OpportunityContactSuggestion | null;
  usedLiveAi: boolean;
  model: string;
}> {
  if (aiUsesMock()) {
    return { suggestion: computeRuleContactSuggestion(opportunity), usedLiveAi: false, model: "mock" };
  }

  const loc = [opportunity.subject.city, opportunity.subject.state].filter(Boolean).join(" ");
  const site = opportunity.subject.website?.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const query = [
    opportunity.subject.name,
    loc,
    site ?? "",
    "owner OR founder OR marketing director OR partnerships email contact",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const search = await tavilySearch(query, {
      maxResults: 6,
      searchDepth: "advanced",
      includeAnswer: true,
    });
    if (search.results.length === 0) {
      return { suggestion: computeRuleContactSuggestion(opportunity), usedLiveAi: false, model: "rules-fallback" };
    }

    const userPrompt = [
      `Business: ${opportunity.subject.name}`,
      loc,
      opportunity.subject.website ? `Website: ${opportunity.subject.website}` : "",
      "",
      "=== WEB RESEARCH (via Tavily) ===",
      formatTavilyResultsForPrompt(search, { maxSnippetChars: 1400, maxResults: 10 }),
      "",
      "Find the best decision-maker contact as the requested JSON.",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = (await callGeminiJsonText(CONTACT_FINDER_SYSTEM, userPrompt)) as Record<string, unknown>;
    const c = (raw.contact && typeof raw.contact === "object" ? raw.contact : {}) as Record<string, unknown>;
    const contact: OpportunityContact = {
      name: cleanStr(c.name),
      title: cleanStr(c.title),
      email: emailStr(c.email),
      phone: cleanStr(c.phone),
      sourceUrl: cleanStr(c.sourceUrl),
      verificationStatus: "unverified",
    };

    if (!hasAnyContactDetail(contact)) {
      return { suggestion: computeRuleContactSuggestion(opportunity), usedLiveAi: true, model: "gemini" };
    }

    const confidenceRaw = typeof raw.confidence === "number" ? raw.confidence : Number(raw.confidence);
    return {
      suggestion: {
        contact,
        rationale: cleanStr(raw.rationale),
        confidence: Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0.6,
        status: "pending",
        generatedAt: new Date().toISOString(),
        source: "ai",
      },
      usedLiveAi: true,
      model: "gemini",
    };
  } catch {
    return { suggestion: computeRuleContactSuggestion(opportunity), usedLiveAi: false, model: "rules-fallback" };
  }
}

import type { EmailClassificationResult } from "@/lib/revenueOpportunities/types/emailThread";

const VALID = new Set([
  "interested",
  "question",
  "not_interested",
  "out_of_office",
  "referral",
  "scheduling",
  "spam",
  "unknown",
]);

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

export function parseEmailClassification(raw: unknown): EmailClassificationResult {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const classification = str(o.classification);
  const summary = str(o.summary) ?? "No summary";
  const suggestedReply = str(o.suggestedReply);
  const score = typeof o.confidenceScore === "number" ? o.confidenceScore : 50;

  return {
    classification: classification && VALID.has(classification) ? (classification as EmailClassificationResult["classification"]) : "unknown",
    summary,
    suggestedReply,
    confidenceScore: Math.min(100, Math.max(0, score)),
  };
}

export function mockEmailClassification(subject: string, snippet: string): EmailClassificationResult {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (text.includes("schedule") || text.includes("call") || text.includes("thursday")) {
    return {
      classification: "scheduling",
      summary: "Prospect wants to schedule a call.",
      suggestedReply: "Thanks for your interest! Thursday afternoon works — I'll send a calendar invite shortly.",
      confidenceScore: 72,
    };
  }
  if (text.includes("out of office") || text.includes("away until")) {
    return {
      classification: "out_of_office",
      summary: "Automatic out-of-office reply.",
      confidenceScore: 90,
    };
  }
  if (text.includes("not interested") || text.includes("unsubscribe")) {
    return {
      classification: "not_interested",
      summary: "Prospect declined further contact.",
      confidenceScore: 85,
    };
  }
  if (text.includes("love to hear") || text.includes("interested")) {
    return {
      classification: "interested",
      summary: "Positive reply — prospect is interested.",
      suggestedReply: "Great to hear! I'll share a tailored concept deck and propose a few times to connect.",
      confidenceScore: 78,
    };
  }
  return {
    classification: "question",
    summary: "Neutral reply that may need a human follow-up.",
    suggestedReply: "Thanks for getting back to us — happy to answer any questions about scope, timeline, or budget.",
    confidenceScore: 55,
  };
}

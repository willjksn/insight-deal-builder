import type { OpportunityRevisionSuggestion } from "@/lib/revenueOpportunities/types/opportunity";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter(Boolean) as string[];
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
}

export function parseRevisionAi(raw: unknown): {
  suggestion: OpportunityRevisionSuggestion;
  confidenceScore: number;
  confidenceReasons: string[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const revisionNotes = strList(o.revisionNotes);
  const updatesRaw = o.suggestedFieldUpdates;
  const suggestedFieldUpdates: Record<string, string> = {};
  if (updatesRaw && typeof updatesRaw === "object" && !Array.isArray(updatesRaw)) {
    for (const [k, v] of Object.entries(updatesRaw as Record<string, unknown>)) {
      const key = str(k);
      const val = str(v);
      if (key && val) suggestedFieldUpdates[key] = val;
    }
  }

  if (revisionNotes.length === 0 && Object.keys(suggestedFieldUpdates).length === 0) {
    return null;
  }

  const readyForReReview = typeof o.readyForReReview === "boolean" ? o.readyForReReview : false;

  return {
    suggestion: {
      revisionNotes:
        revisionNotes.length > 0 ? revisionNotes : ["Review suggested field updates before re-running quality review"],
      suggestedFieldUpdates,
      readyForReReview,
      source: "ai",
      generatedAt: new Date().toISOString(),
    },
    confidenceScore: num(o.confidenceScore, readyForReReview ? 75 : 55),
    confidenceReasons: strList(o.confidenceReasons),
  };
}

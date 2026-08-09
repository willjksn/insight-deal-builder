import type { ResolveManualChunk } from "@/lib/aiEditor/resolveManual/types";

const STOP = new Set([
  "a",
  "an",
  "the",
  "to",
  "in",
  "on",
  "of",
  "for",
  "and",
  "or",
  "how",
  "do",
  "i",
  "my",
  "me",
  "can",
  "please",
  "what",
  "where",
  "when",
  "with",
  "from",
  "into",
  "is",
  "it",
  "this",
  "that",
  "resolve",
  "davinci",
]);

export function tokenizeManualQuery(q: string): string[] {
  return String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .split(/[\s/+.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreChunk(chunk: ResolveManualChunk, tokens: string[], raw: string): number {
  const text = chunk.text.toLowerCase();
  let score = 0;
  const q = raw.toLowerCase().trim();
  if (q.length >= 6 && text.includes(q)) score += 40;

  // Multi-word phrases from the query beat single-token noise
  for (let i = 0; i < tokens.length; i += 1) {
    for (let n = 2; n <= 3; n += 1) {
      const phrase = tokens.slice(i, i + n).join(" ");
      if (phrase.length >= 5 && text.includes(phrase)) score += 16;
    }
  }

  for (const t of tokens) {
    if (!t) continue;
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const hits = text.match(re);
    if (hits?.length) score += Math.min(12, hits.length) * 3;
    else if (text.includes(t)) score += 1;
  }

  // Prefer pages that look instructional
  if (/\b(choose|select|click|drag|press|open|from the)\b/i.test(chunk.text)) {
    score += 2;
  }
  return score;
}

export type ScoredManualChunk = {
  chunk: ResolveManualChunk;
  score: number;
};

/** Local BM25-ish keyword retrieval over indexed manual chunks. */
export function retrieveManualChunks(
  chunks: ResolveManualChunk[],
  query: string,
  limit = 8
): ScoredManualChunk[] {
  const raw = String(query || "").trim();
  const tokens = tokenizeManualQuery(raw);
  if (!raw || (!tokens.length && raw.length < 3)) return [];

  const ranked = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens, raw) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.page - b.chunk.page);

  // Diversify pages a bit — keep best per page, then fill
  const byPage = new Map<number, ScoredManualChunk>();
  for (const row of ranked) {
    const prev = byPage.get(row.chunk.page);
    if (!prev || row.score > prev.score) byPage.set(row.chunk.page, row);
  }
  const diversified = [...byPage.values()].sort((a, b) => b.score - a.score);
  const out = diversified.slice(0, limit);
  if (out.length < limit) {
    for (const row of ranked) {
      if (out.some((o) => o.chunk.id === row.chunk.id)) continue;
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}

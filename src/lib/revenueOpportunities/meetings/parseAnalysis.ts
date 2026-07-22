import { randomUUID } from "crypto";
import type {
  MeetingActionItem,
  MeetingAnalysis,
  MeetingExtractedField,
  MeetingTranscriptSegment,
} from "@/lib/revenueOpportunities/types/meeting";

/** Whitelist of opportunity-targeted extraction fields we accept from the model. */
export const MEETING_EXTRACTION_FIELDS = [
  "nextAction",
  "followUpAt",
  "budget",
  "timeline",
  "decisionMaker",
  "painPoint",
  "scope",
] as const;

const EXTRACTION_SET = new Set<string>(MEETING_EXTRACTION_FIELDS);

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function strList(v: unknown, max = 20): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of v) {
    const t = cleanStr(raw);
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    if (out.length >= max) break;
  }
  return out;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export interface ParsedTranscript {
  text: string;
  segments: MeetingTranscriptSegment[];
  durationSeconds?: number;
}

export function parseTranscript(raw: unknown): ParsedTranscript {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const segmentsRaw = Array.isArray(root.segments) ? root.segments : [];
  const segments: MeetingTranscriptSegment[] = [];
  for (const s of segmentsRaw) {
    if (!s || typeof s !== "object") continue;
    const seg = s as Record<string, unknown>;
    const text = cleanStr(seg.text);
    if (!text) continue;
    segments.push({
      text,
      speaker: cleanStr(seg.speaker),
      start: toNumber(seg.start),
      end: toNumber(seg.end),
    });
  }

  let text = cleanStr(root.text) ?? "";
  if (!text && segments.length) {
    text = segments.map((s) => (s.speaker ? `${s.speaker}: ${s.text}` : s.text)).join("\n");
  }

  return { text, segments, durationSeconds: toNumber(root.durationSeconds) };
}

function parseActionItems(v: unknown): MeetingActionItem[] {
  if (!Array.isArray(v)) return [];
  const out: MeetingActionItem[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      const t = cleanStr(item);
      if (t) out.push({ text: t });
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const text = cleanStr(obj.text);
      if (text) out.push({ text, owner: cleanStr(obj.owner), dueDate: cleanStr(obj.dueDate) });
    }
    if (out.length >= 30) break;
  }
  return out;
}

function parseExtractedFields(v: unknown): MeetingExtractedField[] {
  if (!Array.isArray(v)) return [];
  const out: MeetingExtractedField[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const field = cleanStr(obj.field);
    const suggestedValue = cleanStr(obj.suggestedValue);
    if (!field || !suggestedValue || !EXTRACTION_SET.has(field)) continue;
    const confidenceRaw = toNumber(obj.confidence);
    out.push({
      id: randomUUID(),
      target: "opportunity",
      field,
      suggestedValue,
      confidence:
        confidenceRaw == null
          ? undefined
          : Math.max(0, Math.min(1, confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw)),
      rationale: cleanStr(obj.rationale),
      status: "pending",
    });
    if (out.length >= 20) break;
  }
  return out;
}

export function parseMeetingAnalysis(raw: unknown, source: "ai" | "mock" = "ai"): MeetingAnalysis {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    summary: cleanStr(root.summary),
    decisions: strList(root.decisions),
    actionItems: parseActionItems(root.actionItems),
    risks: strList(root.risks),
    nextSteps: strList(root.nextSteps),
    extractedFields: parseExtractedFields(root.extractedFields),
    generatedAt: new Date().toISOString(),
    source,
  };
}

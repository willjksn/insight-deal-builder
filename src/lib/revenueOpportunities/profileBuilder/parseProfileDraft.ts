import type {
  BusinessProfileFields,
  BusinessProfileType,
} from "@/lib/revenueOpportunities/types/businessProfile";
import { PROFILE_FIELD_GROUPS, type ProfileFieldKind } from "@/lib/revenueOpportunities/profileFields";

export interface ProfileDraftResult {
  fields: BusinessProfileFields;
  confidence: number;
  notes: string[];
}

/** field key -> editor kind, derived from the single field-group config. */
const FIELD_KIND = new Map<keyof BusinessProfileFields, ProfileFieldKind>(
  PROFILE_FIELD_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f.kind])
);

function cleanString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function toList(v: unknown): string[] | undefined {
  let items: string[] = [];
  if (Array.isArray(v)) {
    items = v.map((x) => (typeof x === "string" ? x : String(x)));
  } else if (typeof v === "string") {
    items = v.split(/\r?\n|,/);
  } else {
    return undefined;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const t = raw.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.length ? out : undefined;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,]/g, "").trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toBoolean(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(t)) return true;
    if (["false", "no", "n", "0"].includes(t)) return false;
  }
  return undefined;
}

/** Coerce a raw AI/JSON payload into a clean, type-correct BusinessProfileFields. */
export function parseProfileDraft(raw: unknown): ProfileDraftResult {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawFields =
    root.fields && typeof root.fields === "object"
      ? (root.fields as Record<string, unknown>)
      : root; // tolerate a flat object

  const fields: BusinessProfileFields = {};
  for (const [key, kind] of FIELD_KIND.entries()) {
    const value = rawFields[key];
    if (value == null) continue;
    if (kind === "list") {
      const parsed = toList(value);
      if (parsed) (fields[key] as string[]) = parsed;
    } else if (kind === "number") {
      const parsed = toNumber(value);
      if (parsed != null) (fields[key] as number) = parsed;
    } else if (kind === "boolean") {
      const parsed = toBoolean(value);
      if (parsed != null) (fields[key] as boolean) = parsed;
    } else {
      const parsed = cleanString(value);
      if (parsed) (fields[key] as string) = parsed;
    }
  }

  const confidenceRaw = toNumber(root.confidence);
  const confidence =
    confidenceRaw == null ? 0.5 : Math.min(1, Math.max(0, confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw));

  const notes = toList(root.notes)?.slice(0, 5) ?? [];

  return { fields, confidence, notes };
}

/** Deterministic mock draft used when SCOUT_USE_MOCK_AI is enabled. */
export function mockProfileDraft(
  profileType: BusinessProfileType,
  sourceText: string
): ProfileDraftResult {
  const snippet = sourceText.trim().slice(0, 160);
  if (profileType === "stormi") {
    return {
      fields: {
        description: snippet || "Creator-led brand partnerships with cinematic production support.",
        creatorNiche: "Lifestyle / travel / beauty",
        idealBrands: ["Beauty & wellness", "Fashion", "Travel & hospitality"],
        industries: ["Beauty", "Fashion", "Travel"],
        keywords: ["creator partnership", "ambassador program", "UGC"],
      },
      confidence: 0.4,
      notes: ["Mock draft (SCOUT_USE_MOCK_AI enabled) — replace with real material."],
    };
  }
  return {
    fields: {
      description: snippet || "Cinematic video and photo production for local and regional businesses.",
      services: ["Brand films", "Social reels", "Commercial photography"],
      industries: ["Hospitality", "Real estate", "Medical", "Food & beverage"],
      keywords: ["brand video", "promo video", "content production"],
    },
    confidence: 0.4,
    notes: ["Mock draft (SCOUT_USE_MOCK_AI enabled) — replace with real material."],
  };
}

import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { newReqId } from "@/lib/liveProduction/defaults";
import type {
  LiveAdminRequirement,
  LiveCrewRequirement,
  LiveEquipmentRequirement,
  LiveRequirementPriority,
} from "@/lib/liveProduction/types";

export type LiveAiExtractResult = {
  title?: string;
  organizationName?: string;
  opportunityType?: string;
  location?: string;
  city?: string;
  state?: string;
  venue?: string;
  bidDeadline?: string;
  questionDeadline?: string;
  siteVisitDate?: string;
  eventDates?: string;
  setupDate?: string;
  strikeDate?: string;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  solicitationNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  summary?: string;
  equipmentRequirements: LiveEquipmentRequirement[];
  crewRequirements: LiveCrewRequirement[];
  adminRequirements: LiveAdminRequirement[];
};

const SYSTEM = `You extract structured live-production opportunity requirements for ShootSpine (AV / LED / audio / lighting / staging / crew).
Return JSON only. Do not invent requirements that are not supported by the source text.
Use priority "required" | "preferred" | "unknown".
Dates as YYYY-MM-DD when possible.
Schema:
{
  "title": string,
  "organizationName": string,
  "opportunityType": string,
  "location": string,
  "city": string,
  "state": string,
  "venue": string,
  "bidDeadline": string,
  "questionDeadline": string,
  "siteVisitDate": string,
  "eventDates": string,
  "setupDate": string,
  "strikeDate": string,
  "estimatedValueLow": number|null,
  "estimatedValueHigh": number|null,
  "solicitationNumber": string,
  "contactName": string,
  "contactEmail": string,
  "contactPhone": string,
  "summary": string,
  "equipment": [{"label": string, "quantity": number, "priority": string, "categoryHint": string}],
  "crew": [{"role": string, "quantity": number, "priority": string}],
  "admin": [{"label": string, "priority": string, "notes": string}]
}`;

function asPriority(raw: unknown): LiveRequirementPriority {
  const s = String(raw || "").toLowerCase();
  if (s === "preferred") return "preferred";
  if (s === "unknown") return "unknown";
  return "required";
}

export async function analyzeLiveOpportunityText(
  sourceText: string,
  meta?: { sourceUrl?: string; titleHint?: string }
): Promise<LiveAiExtractResult> {
  const text = sourceText.trim();
  if (!text) {
    return { equipmentRequirements: [], crewRequirements: [], adminRequirements: [] };
  }

  const user = [
    meta?.titleHint ? `Title hint: ${meta.titleHint}` : "",
    meta?.sourceUrl ? `Source URL: ${meta.sourceUrl}` : "",
    "",
    "Opportunity text:",
    text.slice(0, 120000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callGeminiJsonText(SYSTEM, user);
    const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
    return normalizeExtract(data);
  } catch {
    return heuristicExtract(text, meta?.titleHint);
  }
}

function normalizeExtract(data: Record<string, unknown>): LiveAiExtractResult {
  const equipment = Array.isArray(data.equipment) ? data.equipment : [];
  const crew = Array.isArray(data.crew) ? data.crew : [];
  const admin = Array.isArray(data.admin) ? data.admin : [];
  return {
    title: str(data.title),
    organizationName: str(data.organizationName),
    opportunityType: str(data.opportunityType),
    location: str(data.location),
    city: str(data.city),
    state: str(data.state),
    venue: str(data.venue),
    bidDeadline: str(data.bidDeadline),
    questionDeadline: str(data.questionDeadline),
    siteVisitDate: str(data.siteVisitDate),
    eventDates: str(data.eventDates),
    setupDate: str(data.setupDate),
    strikeDate: str(data.strikeDate),
    estimatedValueLow: num(data.estimatedValueLow),
    estimatedValueHigh: num(data.estimatedValueHigh),
    solicitationNumber: str(data.solicitationNumber),
    contactName: str(data.contactName),
    contactEmail: str(data.contactEmail),
    contactPhone: str(data.contactPhone),
    summary: str(data.summary),
    equipmentRequirements: equipment.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: newReqId(),
        label: str(r.label) || "Equipment",
        quantity: Math.max(1, num(r.quantity) || 1),
        priority: asPriority(r.priority),
        categoryHint: str(r.categoryHint) || undefined,
      };
    }),
    crewRequirements: crew.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: newReqId(),
        role: str(r.role) || "Crew",
        quantity: Math.max(1, num(r.quantity) || 1),
        priority: asPriority(r.priority),
      };
    }),
    adminRequirements: admin.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: newReqId(),
        label: str(r.label) || "Requirement",
        priority: asPriority(r.priority),
        notes: str(r.notes) || undefined,
      };
    }),
  };
}

/** Offline / mock fallback for Charlotte-style RFPs when Gemini is unavailable. */
function heuristicExtract(text: string, titleHint?: string): LiveAiExtractResult {
  const lower = text.toLowerCase();
  const equipment: LiveEquipmentRequirement[] = [];
  const addEq = (label: string, quantity: number, categoryHint: string) => {
    if (equipment.some((e) => e.label === label)) return;
    equipment.push({
      id: newReqId(),
      label,
      quantity,
      priority: "required",
      categoryHint,
    });
  };
  if (/led|video wall/.test(lower)) addEq("LED wall", 1, "LED");
  if (/processor/.test(lower)) addEq("LED processor", 1, "LED");
  if (/switcher|playback/.test(lower)) addEq("Video switcher / playback", 1, "Video");
  if (/pa|line array|sound reinforcement|audio/.test(lower)) addEq("PA / audio system", 1, "Audio");
  if (/wireless|microphone|mic/.test(lower)) addEq("Wireless microphones", 12, "Audio");
  if (/console|mixer/.test(lower)) addEq("Digital audio console", 1, "Audio");
  if (/lighting|moving head|uplight/.test(lower)) addEq("Lighting package", 1, "Lighting");
  if (/truss/.test(lower)) addEq("Truss", 1, "Truss");
  if (/stage|staging/.test(lower)) addEq("Stage", 1, "Staging");
  if (/generator|power/.test(lower)) addEq("Generator / power", 1, "Power");

  const crew: LiveCrewRequirement[] = [];
  const addCrew = (role: string, quantity: number) => {
    crew.push({ id: newReqId(), role, quantity, priority: "required" });
  };
  if (/technical director|\btd\b/.test(lower)) addCrew("Technical Director", 1);
  if (/a1|audio engineer/.test(lower)) addCrew("Audio A1", 1);
  if (/lighting/.test(lower)) addCrew("Lighting Director", 1);
  if (/camera/.test(lower)) addCrew("Camera Operator", 3);
  if (/stagehand|utility/.test(lower)) addCrew("Stagehand", 6);

  return {
    title: titleHint || undefined,
    summary: text.slice(0, 280),
    equipmentRequirements: equipment,
    crewRequirements: crew,
    adminRequirements: /insurance|coi|bond|w-9|certif/i.test(text)
      ? [
          {
            id: newReqId(),
            label: "Insurance / vendor paperwork (see source)",
            priority: "required",
          },
        ]
      : [],
  };
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

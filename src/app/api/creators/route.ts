import { NextRequest, NextResponse } from "next/server";
import { createCreator, listCreators } from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type {
  CreatorCreateInput,
  CreatorRelationshipType,
  CreatorStatus,
  CreatorReadinessStatus,
} from "@/lib/creators/types";

export const runtime = "nodejs";

const RELATIONSHIP_TYPES: CreatorRelationshipType[] = [
  "flagship",
  "network",
  "represented",
  "incubator",
  "ugc",
  "campaign_only",
  "external",
  "applicant",
];
const STATUSES: CreatorStatus[] = ["active", "inactive", "archived"];
const READINESS: CreatorReadinessStatus[] = [
  "not_reviewed",
  "needs_development",
  "nearly_ready",
  "campaign_ready",
  "preferred",
  "temporarily_unavailable",
];

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.map((v) => String(v).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

function validateCreate(body: unknown): CreatorCreateInput {
  if (!body || typeof body !== "object") {
    throw new CreatorError("VALIDATION_FAILED", "Request body is required");
  }
  const o = body as Record<string, unknown>;
  const professionalName = typeof o.professionalName === "string" ? o.professionalName.trim() : "";
  if (!professionalName) throw new CreatorError("VALIDATION_FAILED", "Creator name is required");

  const relationshipType = RELATIONSHIP_TYPES.includes(o.relationshipType as CreatorRelationshipType)
    ? (o.relationshipType as CreatorRelationshipType)
    : undefined;
  const status = STATUSES.includes(o.status as CreatorStatus)
    ? (o.status as CreatorStatus)
    : undefined;
  const readinessStatus = READINESS.includes(o.readinessStatus as CreatorReadinessStatus)
    ? (o.readinessStatus as CreatorReadinessStatus)
    : undefined;

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  return {
    professionalName,
    relationshipType,
    status,
    readinessStatus,
    legalName: str(o.legalName),
    email: str(o.email),
    phone: str(o.phone),
    location: str(o.location),
    website: str(o.website),
    portfolioUrl: str(o.portfolioUrl),
    primaryNiche: str(o.primaryNiche),
    secondaryNiches: asStringArray(o.secondaryNiches),
    tags: asStringArray(o.tags),
    notes: str(o.notes),
    source: str(o.source),
    referralSource: str(o.referralSource),
    crewMemberId: str(o.crewMemberId),
    brandProfileId: str(o.brandProfileId),
    businessProfileId: str(o.businessProfileId),
    clientId: str(o.clientId),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const creators = await listCreators(appUser);
    return NextResponse.json({ creators });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const body = await request.json();
    const input = validateCreate(body);
    const creator = await createCreator(appUser, input);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}

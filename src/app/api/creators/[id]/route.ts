import { NextRequest, NextResponse } from "next/server";
import { deleteCreator, getCreator, updateCreator } from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import {
  CREATOR_LIST_FIELDS,
  type CreatorReadinessStatus,
  type CreatorRelationshipType,
  type CreatorStatus,
  type CreatorUpdateInput,
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

/** Scalar string fields editable via PATCH in Phase 1. */
const STRING_FIELDS: (keyof CreatorUpdateInput)[] = [
  "professionalName",
  "legalName",
  "displayName",
  "pronouns",
  "location",
  "serviceArea",
  "travelWillingness",
  "timezone",
  "preferredContact",
  "email",
  "phone",
  "website",
  "portfolioUrl",
  "profileImageUrl",
  "primaryNiche",
  "description",
  "audienceDescription",
  "brandPositioning",
  "brandSafetyNotes",
  "notes",
  "source",
  "referralSource",
  "internalOwnerUserId",
  "dateJoined",
  "dateApproved",
];

const LIST_FIELDS = new Set<string>(CREATOR_LIST_FIELDS as string[]);

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function validateUpdate(body: unknown): CreatorUpdateInput {
  if (!body || typeof body !== "object") {
    throw new CreatorError("VALIDATION_FAILED", "Request body is required");
  }
  const o = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (key in o) {
      const raw = o[key];
      update[key] = typeof raw === "string" ? raw.trim() : "";
    }
  }
  for (const key of Object.keys(o)) {
    if (LIST_FIELDS.has(key)) update[key] = asStringArray(o[key]);
  }
  if ("remoteAvailable" in o) update.remoteAvailable = Boolean(o.remoteAvailable);

  if ("relationshipType" in o) {
    if (!RELATIONSHIP_TYPES.includes(o.relationshipType as CreatorRelationshipType)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid relationship type");
    }
    update.relationshipType = o.relationshipType;
  }
  if ("status" in o) {
    if (!STATUSES.includes(o.status as CreatorStatus)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid status");
    }
    update.status = o.status;
  }
  if ("readinessStatus" in o) {
    if (!READINESS.includes(o.readinessStatus as CreatorReadinessStatus)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid readiness status");
    }
    update.readinessStatus = o.readinessStatus;
  }

  if (typeof update.professionalName === "string" && !update.professionalName) {
    throw new CreatorError("VALIDATION_FAILED", "Creator name cannot be empty");
  }

  return update as CreatorUpdateInput;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const creator = await getCreator(appUser, id);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const body = await request.json();
    const input = validateUpdate(body);
    const creator = await updateCreator(appUser, id, input);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    await deleteCreator(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return creatorApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { setCreatorApplicationStatus } from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import {
  APPLICATION_STATUSES,
  RELATIONSHIP_TYPES,
} from "@/lib/creators/validate";
import type {
  CreatorApplicationStatus,
  CreatorRelationshipType,
} from "@/lib/creators/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    const applicationStatus = body.applicationStatus as CreatorApplicationStatus;
    if (!APPLICATION_STATUSES.includes(applicationStatus)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid application status");
    }
    const promoteTo =
      typeof body.promoteTo === "string" &&
      RELATIONSHIP_TYPES.includes(body.promoteTo as CreatorRelationshipType)
        ? (body.promoteTo as CreatorRelationshipType)
        : undefined;
    const reviewNotes =
      typeof body.reviewNotes === "string" ? body.reviewNotes : undefined;

    const creator = await setCreatorApplicationStatus(appUser, id, applicationStatus, {
      reviewNotes,
      promoteTo,
    });
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}

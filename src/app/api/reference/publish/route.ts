import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertApprovedUser,
  requireAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { canManageUsers } from "@/lib/utils/permissions";
import {
  discardReferenceDraft,
  getReferenceGuideAdminState,
  publishReferenceGuide,
} from "@/lib/reference/referenceGuideStore";
import { draftToGuide } from "@/lib/reference/referenceResearch";
import { ReferenceGuideDocument } from "@/lib/reference/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireAuthUser(request);
    assertApprovedUser(appUser);
    if (!canManageUsers(appUser)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = (await request.json()) as {
      action: "publish" | "discard";
      guide?: ReferenceGuideDocument;
    };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    if (body.action === "discard") {
      await discardReferenceDraft(db);
      const state = await getReferenceGuideAdminState(db);
      return NextResponse.json(state);
    }

    if (body.action !== "publish") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const state = await getReferenceGuideAdminState(db);
    const guide =
      body.guide ??
      (state.draft ? draftToGuide(state.draft, state.published) : state.published);

    if (!guide?.sections?.length) {
      return NextResponse.json({ error: "No guide to publish" }, { status: 400 });
    }

    await publishReferenceGuide(db, guide, uid);
    const updated = await getReferenceGuideAdminState(db);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

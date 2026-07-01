import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { canManageUsers } from "@/lib/utils/permissions";
import {
  getPublishedReferenceGuide,
  getReferenceGuideAdminState,
  saveReferenceDraft,
} from "@/lib/reference/referenceGuideStore";
import { researchReferenceGuideUpdates } from "@/lib/reference/referenceResearch";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    if (!canManageUsers(appUser)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const state = await getReferenceGuideAdminState(db);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load admin reference state";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    if (!canManageUsers(appUser)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { focusNote?: string };
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const published = await getPublishedReferenceGuide(db);
    const draft = await researchReferenceGuideUpdates(published, body.focusNote);
    await saveReferenceDraft(db, draft);

    const state = await getReferenceGuideAdminState(db);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reference research failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

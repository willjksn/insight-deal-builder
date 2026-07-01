import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseScriptWriter,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getPublishedReferenceGuide } from "@/lib/reference/referenceGuideStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanUseScriptWriter(appUser);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const guide = await getPublishedReferenceGuide(db);
    return NextResponse.json({ guide });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load reference guide";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { orgAnalyticsCompany } from "@/lib/aiEditor/orgInsights";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * V19 — opt in/out of sharing anonymized AI Editor patterns with your organization.
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const body = (await request.json()) as { enabled?: boolean };
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled boolean is required" }, { status: 400 });
    }

    const company = orgAnalyticsCompany(appUser);
    if (body.enabled && !company) {
      return NextResponse.json(
        { error: "An organization must be assigned on your account before sharing patterns." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const now = new Date().toISOString();
    await db.collection("users").doc(uid).set(
      {
        aiEditorShareOrgAnalytics: body.enabled,
        aiEditorShareOrgAnalyticsAt: now,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      enabled: body.enabled,
      company,
      at: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update preference";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

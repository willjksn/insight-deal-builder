import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { CONTENT_PLAN_PITCH_SESSIONS_COLLECTION } from "@/lib/contentPlan/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db.collection(CONTENT_PLAN_PITCH_SESSIONS_COLLECTION).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = snap.data() || {};
    if (data.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ session: { id: snap.id, ...data } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load pitch session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

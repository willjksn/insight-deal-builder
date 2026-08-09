import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CONTENT_PLANS_COLLECTION } from "@/lib/contentPlan/collections";
import { buildClonedContentPlanPayload } from "@/lib/contentPlan/clonePlan";
import type { ContentPlan } from "@/lib/contentPlan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Duplicate a content plan (content only — no project links). */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db.collection(CONTENT_PLANS_COLLECTION).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const source = { id: snap.id, ...snap.data() } as ContentPlan;
    if (source.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = buildClonedContentPlanPayload(source);
    const ref = await db.collection(CONTENT_PLANS_COLLECTION).add(
      stripUndefined({
        ...payload,
        userId: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    const next = await ref.get();
    return NextResponse.json({ plan: { id: next.id, ...next.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clone failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

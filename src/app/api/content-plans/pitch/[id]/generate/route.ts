import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CONTENT_PLAN_PITCH_SESSIONS_COLLECTION } from "@/lib/contentPlan/collections";
import { generatePitchIdeaBatch } from "@/lib/contentPlan/generatePitchIdeas";
import type { ContentPlanPitchIdea } from "@/lib/contentPlan/pitchTypes";
import {
  capPitchTargets,
  remainingPitchTargets,
  totalTargetCount,
} from "@/lib/contentPlan/pitchTargets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const ref = db.collection(CONTENT_PLAN_PITCH_SESSIONS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = snap.data() || {};
    if (data.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deliverables = Array.isArray(data.deliverables) ? data.deliverables : [];
    const existing: ContentPlanPitchIdea[] = Array.isArray(data.ideas) ? data.ideas : [];
    const targets = capPitchTargets(remainingPitchTargets(deliverables, existing));
    if (totalTargetCount(targets) === 0) {
      return NextResponse.json(
        { error: "All package deliverable slots already have ideas." },
        { status: 400 }
      );
    }

    const batch = await generatePitchIdeaBatch({
      clientName: String(data.clientName || "Client"),
      businessContext: String(data.businessContext || ""),
      brand: data.brand ? String(data.brand) : undefined,
      product: data.product ? String(data.product) : undefined,
      packageName: String(data.packageName || "Package"),
      targets,
    });

    const ideas = [...existing, ...batch];
    await ref.set(
      stripUndefined({
        ideas,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    );

    const next = await ref.get();
    return NextResponse.json({ session: { id: next.id, ...next.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate more ideas";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

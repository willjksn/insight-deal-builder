import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { CONTENT_PLAN_PITCH_SESSIONS_COLLECTION } from "@/lib/contentPlan/collections";
import type { ContentPlanPitchIdea } from "@/lib/contentPlan/pitchTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; ideaId: string }> };

/** Patch a single pitch idea (e.g. dismiss). */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id, ideaId } = await ctx.params;
    const body = (await request.json()) as { status?: ContentPlanPitchIdea["status"] };

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

    const ideas: ContentPlanPitchIdea[] = Array.isArray(data.ideas) ? [...data.ideas] : [];
    const idx = ideas.findIndex((i) => i?.id === ideaId);
    if (idx < 0) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    if (body.status !== undefined) {
      if (!["new", "developed", "dismissed"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (ideas[idx].contentPlanId && body.status === "dismissed") {
        return NextResponse.json(
          { error: "Cannot dismiss an idea that already has a Content plan." },
          { status: 400 }
        );
      }
      ideas[idx] = { ...ideas[idx], status: body.status };
    }

    await ref.set({ ideas, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const next = await ref.get();
    return NextResponse.json({ session: { id: next.id, ...next.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update pitch idea";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

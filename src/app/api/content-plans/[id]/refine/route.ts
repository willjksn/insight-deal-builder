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
import {
  refineContentPlanSection,
  type RefineTarget,
} from "@/lib/contentPlan/generate/refine";
import type { ContentPlan } from "@/lib/contentPlan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

const TARGETS: RefineTarget[] = [
  "brief",
  "beats",
  "script",
  "shots",
  "shot",
  "edit",
  "sound",
  "music",
  "look",
  "lighting",
  "coverage",
  "shoot_order",
  "checklist",
];

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      instruction?: string;
      target?: RefineTarget;
      shotId?: string;
    };

    const instruction = String(body.instruction || "").trim();
    const target = body.target;
    if (!instruction) {
      return NextResponse.json({ error: "instruction is required" }, { status: 400 });
    }
    if (!target || !TARGETS.includes(target)) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection(CONTENT_PLANS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const plan = { id: snap.id, ...snap.data() } as ContentPlan;
    if (plan.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patch = await refineContentPlanSection({
      plan,
      instruction,
      target,
      shotId: body.shotId,
    });

    await ref.set(
      stripUndefined({
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
        lastError: null,
        status: plan.status === "error" ? "partial" : plan.status,
      }),
      { merge: true }
    );

    const next = await ref.get();
    return NextResponse.json({ plan: { id: next.id, ...next.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refine failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

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
  defaultContentPlanInputs,
  DURATION_OPTIONS,
  type ContentPlanInputs,
  type ContentShot,
  type CoveragePlan,
  type ShootChecklist,
  type ShootOrderPlan,
} from "@/lib/contentPlan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function normalizeInputs(raw: Partial<ContentPlanInputs>): ContentPlanInputs {
  const base = defaultContentPlanInputs(raw);
  const preset = DURATION_OPTIONS.find((d) => d.value === base.durationPreset);
  if (base.durationPreset !== "custom" && preset) {
    base.durationSeconds = preset.seconds;
  }
  base.idea = String(base.idea || "").trim();
  return base;
}

export async function GET(request: NextRequest, ctx: Ctx) {
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
    const data = snap.data() || {};
    if (data.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ plan: { id: snap.id, ...data } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load content plan";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const ref = db.collection(CONTENT_PLANS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = snap.data() || {};
    if (data.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete content plan";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      inputs?: Partial<ContentPlanInputs>;
      title?: string;
      teachMe?: boolean;
      shots?: ContentShot[];
      coveragePlan?: CoveragePlan;
      shootOrderPlan?: ShootOrderPlan;
      checklist?: ShootChecklist;
      projectId?: string | null;
      scriptSessionId?: string | null;
    };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection(CONTENT_PLANS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const existing = snap.data() || {};
    if (existing.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patch: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (body.title !== undefined) patch.title = String(body.title || "").trim();
    if (typeof body.teachMe === "boolean") {
      patch.teachMe = body.teachMe;
      if (body.inputs === undefined) {
        patch.inputs = {
          ...existing.inputs,
          teachMe: body.teachMe,
        };
      }
    }
    if (body.inputs) {
      const inputs = normalizeInputs({
        ...(existing.inputs || {}),
        ...body.inputs,
      });
      patch.inputs = inputs;
      patch.teachMe = inputs.teachMe;
    }
    if (Array.isArray(body.shots)) patch.shots = body.shots;
    if (body.coveragePlan) patch.coveragePlan = body.coveragePlan;
    if (body.shootOrderPlan) patch.shootOrderPlan = body.shootOrderPlan;
    if (body.checklist) patch.checklist = body.checklist;
    if (body.projectId !== undefined) patch.projectId = body.projectId;
    if (body.scriptSessionId !== undefined) patch.scriptSessionId = body.scriptSessionId;

    await ref.set(stripUndefined(patch), { merge: true });
    const next = await ref.get();
    return NextResponse.json({ plan: { id: next.id, ...next.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update content plan";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

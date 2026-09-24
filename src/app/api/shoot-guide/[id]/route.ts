import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SHOOT_GUIDES_COLLECTION } from "@/lib/shootGuide/collections";
import { resolveShotCount } from "@/lib/shootGuide/defaults";
import type { ShootGuidePatch } from "@/lib/shootGuide/types";

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

    const snap = await db.collection(SHOOT_GUIDES_COLLECTION).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = snap.data() || {};
    if (data.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ guide: { id: snap.id, ...data } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load shoot guide";
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

    const ref = db.collection(SHOOT_GUIDES_COLLECTION).doc(id);
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
    const message = err instanceof Error ? err.message : "Failed to delete shoot guide";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json()) as ShootGuidePatch;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection(SHOOT_GUIDES_COLLECTION).doc(id);
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

    if (body.title !== undefined) patch.title = String(body.title || "").trim() || existing.title;
    if (body.prompt !== undefined) patch.prompt = String(body.prompt || "").trim();
    if (body.outputType === "real" || body.outputType === "ai" || body.outputType === "hybrid") {
      patch.outputType = body.outputType;
    }
    if (body.status !== undefined) patch.status = body.status;
    if (body.mode !== undefined) patch.mode = body.mode;
    if (body.creativeStylePreset !== undefined) patch.creativeStylePreset = body.creativeStylePreset;
    if (body.creativeIntent !== undefined) patch.creativeIntent = String(body.creativeIntent || "").trim();
    if (Array.isArray(body.visualPriorities)) patch.visualPriorities = body.visualPriorities;
    if (body.shotCountMode !== undefined) {
      patch.shotCountMode = body.shotCountMode;
      patch.desiredShotCount = resolveShotCount(body.shotCountMode, body.desiredShotCount);
    } else if (body.desiredShotCount !== undefined) {
      patch.desiredShotCount = resolveShotCount(
        existing.shotCountMode,
        body.desiredShotCount
      );
    }
    if (typeof body.useMyEquipment === "boolean") patch.useMyEquipment = body.useMyEquipment;
    if (typeof body.showIdealWhenNotOwned === "boolean") {
      patch.showIdealWhenNotOwned = body.showIdealWhenNotOwned;
    }
    if (body.currentShotId !== undefined) patch.currentShotId = body.currentShotId;
    if (body.projectId !== undefined) patch.projectId = body.projectId;
    if (Array.isArray(body.references)) patch.references = body.references;
    if (body.sceneAnalysis !== undefined) patch.sceneAnalysis = body.sceneAnalysis;
    if (body.locationAnalysis !== undefined) patch.locationAnalysis = body.locationAnalysis;
    if (body.visualAnalysis !== undefined) patch.visualAnalysis = body.visualAnalysis;
    if (body.lightingPlan !== undefined) patch.lightingPlan = body.lightingPlan;
    if (body.placementPlan !== undefined) patch.placementPlan = body.placementPlan;
    if (body.equipmentPlan !== undefined) patch.equipmentPlan = body.equipmentPlan;
    if (body.overview) {
      patch.overview = { ...(existing.overview || {}), ...body.overview };
    }
    if (body.setup) {
      patch.setup = { ...(existing.setup || {}), ...body.setup };
    }
    if (Array.isArray(body.shots)) patch.shots = body.shots;
    if (Array.isArray(body.checklist)) patch.checklist = body.checklist;
    if (Array.isArray(body.slateRecords)) patch.slateRecords = body.slateRecords;
    if (Array.isArray(body.continuityRecords)) patch.continuityRecords = body.continuityRecords;
    if (Array.isArray(body.notes)) patch.notes = body.notes;

    await ref.set(stripUndefined(patch), { merge: true });
    const next = await ref.get();
    return NextResponse.json({ guide: { id: next.id, ...next.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update shoot guide";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

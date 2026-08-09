import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageProjects,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { syncLinkedProjectFromContentPlan } from "@/lib/contentPlan/syncLinkedProject";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** Refresh the linked project from the latest Content Plan (script, board shots, AI Editor notes). */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    assertCanManageProjects(appUser);
    const { id: planId } = await ctx.params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const result = await syncLinkedProjectFromContentPlan({ db, uid, planId });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync project failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

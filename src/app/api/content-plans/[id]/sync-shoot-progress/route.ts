import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageProjects,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { syncShootProgressFromContentPlan } from "@/lib/contentPlan/syncShootProgressToBoardServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Push Shoot Mode done/takes/notes onto the linked production board (no script regenerate). */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    assertCanManageProjects(appUser);
    const { id: planId } = await ctx.params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const result = await syncShootProgressFromContentPlan({ db, uid, planId });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync shoot progress failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

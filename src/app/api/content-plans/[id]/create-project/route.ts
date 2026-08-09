import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageProjects,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { createProjectFromContentPlan } from "@/lib/contentPlan/createProjectFromPlan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** Create (or apply to) a ShootSpine project from a Content Plan — seeds script, board shots, AI Editor notes. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    assertCanManageProjects(appUser);
    const { id: planId } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      projectName?: string;
      existingProjectId?: string;
    };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const result = await createProjectFromContentPlan({
      db,
      uid,
      planId,
      projectName: body.projectName,
      existingProjectId: body.existingProjectId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create project failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

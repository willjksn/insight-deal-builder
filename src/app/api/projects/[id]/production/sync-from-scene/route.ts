import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { sceneSyncStatus, updateProductionFromScene } from "@/lib/production/sceneBuilderSend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const status = await sceneSyncStatus({ uid, projectId: id });
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not check Scene Builder";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { productionShotId?: string };
    const result = await updateProductionFromScene({
      uid,
      projectId: id,
      productionShotId: body.productionShotId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update from Scene Builder";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

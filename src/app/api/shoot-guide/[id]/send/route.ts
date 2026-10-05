import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageProjects,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { sendSceneToProduction } from "@/lib/production/sceneBuilderSend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      shotIds?: string[];
      mode?: "new" | "existing";
      projectName?: string;
      projectId?: string;
    };
    const mode = body.mode === "existing" ? "existing" : "new";
    if (mode === "new") assertCanManageProjects(appUser);
    if (!Array.isArray(body.shotIds) || body.shotIds.length === 0) {
      return NextResponse.json({ error: "Select at least one shot" }, { status: 400 });
    }
    const result = await sendSceneToProduction({
      uid,
      guideId: id,
      shotIds: body.shotIds,
      mode,
      projectName: body.projectName,
      projectId: body.projectId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send shots";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

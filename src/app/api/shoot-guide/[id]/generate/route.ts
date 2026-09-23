import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { runShootGuideGeneration } from "@/lib/shootGuide/generate/pipeline";
import {
  SHOOT_GUIDE_GENERATE_STAGES,
  type ShootGuideGenerateRequest,
  type ShootGuideGenerateStage,
} from "@/lib/shootGuide/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as ShootGuideGenerateRequest;
    const stage = (body.stage || "all") as ShootGuideGenerateStage;
    if (!SHOOT_GUIDE_GENERATE_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    if (stage === "shot" && !body.shotId) {
      return NextResponse.json({ error: "shotId is required" }, { status: 400 });
    }

    const guide = await runShootGuideGeneration({
      guideId: id,
      userId: uid,
      request: { ...body, stage },
    });
    return NextResponse.json({ guide });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

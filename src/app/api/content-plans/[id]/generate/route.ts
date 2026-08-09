import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { runContentPlanGeneration } from "@/lib/contentPlan/generate/pipeline";
import type { ContentPlanGenerateSection } from "@/lib/contentPlan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      section?: ContentPlanGenerateSection;
    };
    const section = body.section || "all";
    const allowed = [
      "all",
      "phase1",
      "brief",
      "beats",
      "script",
      "shots",
      "phase2",
      "edit",
      "sound",
      "music",
      "look",
      "lighting",
      "phase3",
      "coverage",
      "shoot_order",
      "checklist",
    ];
    if (!allowed.includes(section)) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const plan = await runContentPlanGeneration({
      planId: id,
      userId: uid,
      section,
    });

    if (plan.status === "error") {
      return NextResponse.json(
        { error: plan.lastError || "Generation failed", plan },
        { status: 500 }
      );
    }

    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

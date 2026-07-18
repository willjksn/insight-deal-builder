import { NextRequest, NextResponse } from "next/server";
import { setOpportunityPipelineStage } from "@/lib/revenueOpportunities/server/opportunities";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import { PIPELINE_STAGE_LABELS } from "@/lib/revenueOpportunities/labels";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as { pipelineStage?: string };
    const pipelineStage = body.pipelineStage;
    if (!pipelineStage || !(pipelineStage in PIPELINE_STAGE_LABELS)) {
      return NextResponse.json({ error: "Valid pipelineStage is required" }, { status: 400 });
    }
    const opportunity = await setOpportunityPipelineStage(
      appUser,
      id,
      pipelineStage as RevenuePipelineStage,
      { source: "manual" }
    );
    return NextResponse.json({ opportunity });
  } catch (err) {
    return revenueApiError(err);
  }
}

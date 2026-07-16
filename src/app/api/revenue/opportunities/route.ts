import { NextRequest, NextResponse } from "next/server";
import {
  createOpportunity,
  listOpportunities,
} from "@/lib/revenueOpportunities/server/opportunities";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import { validateOpportunityCreate } from "@/lib/revenueOpportunities/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { searchParams } = new URL(request.url);
    const pipelineStage = searchParams.get("pipelineStage") as RevenuePipelineStage | null;
    const campaignId = searchParams.get("campaignId") ?? undefined;
    const approvalStatus = searchParams.get("approvalStatus") ?? undefined;
    const opportunities = await listOpportunities(appUser, {
      pipelineStage: pipelineStage ?? undefined,
      campaignId,
      approvalStatus,
    });
    return NextResponse.json({ opportunities });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const body = await request.json();
    const input = validateOpportunityCreate(body);
    const opportunity = await createOpportunity(appUser, input);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return revenueApiError(err);
  }
}

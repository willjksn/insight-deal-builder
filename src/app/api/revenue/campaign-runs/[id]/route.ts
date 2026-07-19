import { NextRequest, NextResponse } from "next/server";
import { deleteCampaignRun } from "@/lib/revenueOpportunities/server/campaignRuns";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    await deleteCampaignRun(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return revenueApiError(err);
  }
}

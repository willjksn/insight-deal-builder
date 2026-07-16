import { NextRequest, NextResponse } from "next/server";
import { listCampaignRuns } from "@/lib/revenueOpportunities/server/campaignRuns";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const campaignId = new URL(request.url).searchParams.get("campaignId") ?? undefined;
    const runs = await listCampaignRuns(appUser, campaignId);
    return NextResponse.json({ runs });
  } catch (err) {
    return revenueApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { listOutreachActivities } from "@/lib/revenueOpportunities/server/outreach";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueOutreachStatus } from "@/lib/revenueOpportunities/types/outreach";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunityId") ?? undefined;
    const status = searchParams.get("status") as RevenueOutreachStatus | null;
    const activities = await listOutreachActivities(appUser, {
      opportunityId,
      status: status ?? undefined,
    });
    return NextResponse.json({ activities });
  } catch (err) {
    return revenueApiError(err);
  }
}

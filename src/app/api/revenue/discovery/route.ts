import { NextRequest, NextResponse } from "next/server";
import { listDiscoverySessions } from "@/lib/revenueOpportunities/server/discoverySessions";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueDiscoverySessionStatus } from "@/lib/revenueOpportunities/types/discovery";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunityId") ?? undefined;
    const status = searchParams.get("status") as RevenueDiscoverySessionStatus | null;
    const sessions = await listDiscoverySessions(appUser, {
      opportunityId,
      status: status ?? undefined,
    });
    return NextResponse.json({ sessions });
  } catch (err) {
    return revenueApiError(err);
  }
}

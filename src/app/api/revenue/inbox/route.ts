import { NextRequest, NextResponse } from "next/server";
import { listEmailThreads } from "@/lib/revenueOpportunities/server/emailThreads";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueEmailThreadStatus } from "@/lib/revenueOpportunities/types/emailThread";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunityId") ?? undefined;
    const status = searchParams.get("status") as RevenueEmailThreadStatus | null;
    const threads = await listEmailThreads(appUser, { opportunityId, status: status ?? undefined });
    return NextResponse.json({ threads });
  } catch (err) {
    return revenueApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { listAgentRuns } from "@/lib/revenueOpportunities/server/agentRunner";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueAgentName } from "@/lib/revenueOpportunities/types/agentRun";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunityId") ?? undefined;
    const agentName = (searchParams.get("agentName") as RevenueAgentName | null) ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const runs = await listAgentRuns(appUser, { opportunityId, agentName, limit });
    return NextResponse.json({ runs });
  } catch (err) {
    return revenueApiError(err);
  }
}

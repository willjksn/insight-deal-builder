import { NextRequest, NextResponse } from "next/server";
import { getAgentRun } from "@/lib/revenueOpportunities/server/agentRunner";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const run = await getAgentRun(appUser, id);
    return NextResponse.json({ run });
  } catch (err) {
    return revenueApiError(err);
  }
}

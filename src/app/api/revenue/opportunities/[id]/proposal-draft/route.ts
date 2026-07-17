import { NextRequest, NextResponse } from "next/server";
import { runProposalDraftForOpportunity } from "@/lib/revenueOpportunities/server/discoveryRun";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { discoverySessionId?: string };
    const result = await runProposalDraftForOpportunity(appUser, id, body.discoverySessionId);
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}

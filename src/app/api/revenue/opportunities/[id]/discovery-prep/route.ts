import { NextRequest, NextResponse } from "next/server";
import { runDiscoveryPrepForOpportunity } from "@/lib/revenueOpportunities/server/discoveryRun";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { scheduledAt?: string };
    const result = await runDiscoveryPrepForOpportunity(appUser, id, body.scheduledAt);
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { retryFailedWorkflowRun } from "@/lib/revenueOpportunities/server/workflowRuns";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(_request);
    const { id } = await context.params;
    const run = await retryFailedWorkflowRun(appUser, id);
    return NextResponse.json({ run });
  } catch (err) {
    return revenueApiError(err);
  }
}

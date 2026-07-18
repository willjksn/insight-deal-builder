import { NextRequest, NextResponse } from "next/server";
import { REVENUE_WORKFLOW_CATALOG } from "@/lib/revenueOpportunities/n8n/catalog";
import { listWorkflowRuns } from "@/lib/revenueOpportunities/server/workflowRuns";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const workflowName = request.nextUrl.searchParams.get("workflowName") ?? undefined;
    const runs = await listWorkflowRuns(appUser, {
      status: status as never,
      workflowName,
      limit: 50,
    });
    return NextResponse.json({ catalog: REVENUE_WORKFLOW_CATALOG, runs });
  } catch (err) {
    return revenueApiError(err);
  }
}

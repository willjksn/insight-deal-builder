import { NextRequest, NextResponse } from "next/server";
import { triggerRevenueWorkflow } from "@/lib/revenueOpportunities/server/workflowRuns";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const body = (await request.json()) as { workflowName?: string };
    const workflowName = body.workflowName?.trim();
    if (!workflowName) {
      return NextResponse.json({ error: "workflowName is required" }, { status: 400 });
    }
    const run = await triggerRevenueWorkflow(appUser, workflowName, {
      trigger: "manual",
      organizationCompany: appUser.company!.trim(),
      ownerUserId: appUser.id,
      inputSummary: `Manual trigger: ${workflowName}`,
    });
    return NextResponse.json({ run });
  } catch (err) {
    return revenueApiError(err);
  }
}

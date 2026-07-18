import { NextRequest, NextResponse } from "next/server";
import { isRevenueOpportunitiesEnabled } from "@/lib/revenueOpportunities/featureFlag";
import { revenueCronOrganizationCompany } from "@/lib/revenueOpportunities/n8n/config";
import { REVENUE_WORKFLOW_CATALOG } from "@/lib/revenueOpportunities/n8n/catalog";
import { triggerRevenueWorkflow } from "@/lib/revenueOpportunities/server/workflowRuns";

export const runtime = "nodejs";
export const maxDuration = 120;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/** Scheduled revenue automations — triggers n8n workflows for the IMG tenant. */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRevenueOpportunitiesEnabled()) {
    return NextResponse.json({ error: "Revenue disabled" }, { status: 503 });
  }

  const organizationCompany = revenueCronOrganizationCompany();
  const results: { workflowName: string; runId: string; status: string; error?: string }[] = [];

  for (const workflow of REVENUE_WORKFLOW_CATALOG) {
    try {
      const run = await triggerRevenueWorkflow(null, workflow.name, {
        trigger: "scheduled",
        organizationCompany,
        inputSummary: `Scheduled: ${workflow.label}`,
      });
      results.push({ workflowName: workflow.name, runId: run.id, status: run.status });
    } catch (err) {
      results.push({
        workflowName: workflow.name,
        runId: "",
        status: "failed",
        error: err instanceof Error ? err.message : "Trigger failed",
      });
    }
  }

  return NextResponse.json({ ok: true, organizationCompany, results });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

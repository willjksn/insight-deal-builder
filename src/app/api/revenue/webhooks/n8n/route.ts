import { NextRequest, NextResponse } from "next/server";
import { verifyN8nWebhookSecret } from "@/lib/revenueOpportunities/n8n/webhookAuth";
import { applyWorkflowWebhookUpdate } from "@/lib/revenueOpportunities/server/workflowRuns";
import type { RevenueWorkflowRunStatus } from "@/lib/revenueOpportunities/types/workflowRun";

export const runtime = "nodejs";

const VALID_STATUS = new Set<RevenueWorkflowRunStatus>(["queued", "running", "completed", "failed"]);

/** Inbound status callbacks from n8n workflows. */
export async function POST(request: NextRequest) {
  if (!verifyN8nWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    runId?: string;
    organizationCompany?: string;
    status?: string;
    externalRunId?: string;
    errorSummary?: string;
    outputSummary?: string;
  };

  const runId = body.runId?.trim();
  const organizationCompany = body.organizationCompany?.trim();
  const status = body.status?.trim() as RevenueWorkflowRunStatus | undefined;

  if (!runId || !organizationCompany || !status || !VALID_STATUS.has(status)) {
    return NextResponse.json(
      { error: "runId, organizationCompany, and valid status are required" },
      { status: 400 }
    );
  }

  try {
    const run = await applyWorkflowWebhookUpdate({
      runId,
      organizationCompany,
      status,
      externalRunId: body.externalRunId,
      errorSummary: body.errorSummary,
      outputSummary: body.outputSummary,
    });
    return NextResponse.json({ ok: true, run });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

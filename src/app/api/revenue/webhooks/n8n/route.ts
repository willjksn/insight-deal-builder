import { NextRequest, NextResponse } from "next/server";
import { inspectN8nWebhookSecret } from "@/lib/revenueOpportunities/n8n/webhookAuth";
import { applyWorkflowWebhookUpdate } from "@/lib/revenueOpportunities/server/workflowRuns";
import type { RevenueWorkflowRunStatus } from "@/lib/revenueOpportunities/types/workflowRun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<RevenueWorkflowRunStatus>(["queued", "running", "completed", "failed"]);

/** Inbound status callbacks from n8n workflows. */
export async function POST(request: NextRequest) {
  try {
    const auth = inspectN8nWebhookSecret(request);
    if (!auth.ok) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          reason: auth.reason,
          expectedLength: auth.expectedLength,
          receivedLength: auth.receivedLength,
        },
        { status: 401 }
      );
    }

    let body: {
      runId?: string;
      organizationCompany?: string;
      status?: string;
      externalRunId?: string;
      errorSummary?: string;
      outputSummary?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const runId = typeof body.runId === "string" ? body.runId.trim() : "";
    const organizationCompany =
      typeof body.organizationCompany === "string" ? body.organizationCompany.trim() : "";
    const status = (typeof body.status === "string" ? body.status.trim() : "") as RevenueWorkflowRunStatus;

    if (!runId || !organizationCompany || !status || !VALID_STATUS.has(status)) {
      return NextResponse.json(
        { error: "runId, organizationCompany, and valid status are required" },
        { status: 400 }
      );
    }

    const run = await applyWorkflowWebhookUpdate({
      runId,
      organizationCompany,
      status,
      externalRunId: typeof body.externalRunId === "string" ? body.externalRunId : undefined,
      errorSummary: typeof body.errorSummary === "string" ? body.errorSummary : undefined,
      outputSummary: typeof body.outputSummary === "string" ? body.outputSummary : undefined,
    });

    // Minimal payload — avoid serializing full Firestore docs to n8n.
    return NextResponse.json({
      ok: true,
      runId: run.id,
      status: run.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    console.error("[revenue/webhooks/n8n]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { n8nWebhookSecret } from "@/lib/revenueOpportunities/n8n/config";
import { inspectN8nWebhookSecret } from "@/lib/revenueOpportunities/n8n/webhookAuth";
import { applyWorkflowWebhookUpdate } from "@/lib/revenueOpportunities/server/workflowRuns";
import type { RevenueWorkflowRunStatus } from "@/lib/revenueOpportunities/types/workflowRun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<RevenueWorkflowRunStatus>(["queued", "running", "completed", "failed"]);

type CallbackBody = {
  runId?: string;
  organizationCompany?: string;
  status?: string;
  externalRunId?: string;
  errorSummary?: string;
  outputSummary?: string;
  webhookSecret?: string;
};

function parseCallbackBody(raw: string): { body?: CallbackBody; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Empty body" };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { body: parsed as CallbackBody };
    }
    return { error: "JSON body must be an object" };
  } catch {
    // n8n sometimes double-encodes or sends a JS-like object string; last resort no-op
    return { error: `Invalid JSON body (received ${trimmed.length} chars)` };
  }
}

/** Inbound status callbacks from n8n workflows. */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const parsed = parseCallbackBody(raw);
    if (!parsed.body) {
      return NextResponse.json({ error: parsed.error ?? "Invalid JSON body" }, { status: 400 });
    }
    const body = parsed.body;

    const expected = n8nWebhookSecret();
    const bodySecret = typeof body.webhookSecret === "string" ? body.webhookSecret.trim() : "";
    const headerAuth = inspectN8nWebhookSecret(request);
    const bodyAuthOk = Boolean(expected && bodySecret && bodySecret === expected);

    if (!headerAuth.ok && !bodyAuthOk) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          reason: bodySecret ? "secret_mismatch" : headerAuth.reason,
          expectedLength: expected?.length,
          receivedLength: bodySecret
            ? bodySecret.length
            : "receivedLength" in headerAuth
              ? headerAuth.receivedLength
              : undefined,
          hint: "Send header X-Revenue-Webhook-Secret or JSON field webhookSecret matching Vercel N8N_WEBHOOK_SECRET",
        },
        { status: 401 }
      );
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

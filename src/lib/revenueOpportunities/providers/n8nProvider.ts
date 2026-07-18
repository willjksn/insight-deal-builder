import type { WorkflowProvider, WorkflowRunStatus } from "@/lib/revenueOpportunities/providers";
import { getWorkflowCatalogEntry } from "@/lib/revenueOpportunities/n8n/catalog";
import { n8nBaseUrl, n8nConfigured } from "@/lib/revenueOpportunities/n8n/config";
import { n8nOutboundHeaders } from "@/lib/revenueOpportunities/n8n/webhookAuth";

export interface N8nTriggerPayload {
  workflowName: string;
  organizationCompany: string;
  trigger: "scheduled" | "manual" | "retry";
  runId: string;
  ownerUserId?: string;
  /** Hint for n8n callback outputSummary, e.g. "Inbox sync done". */
  suggestedOutputSummary?: string;
  input?: Record<string, unknown>;
}

export interface N8nTriggerResponse {
  runId?: string;
  externalRunId?: string;
  status?: WorkflowRunStatus["status"];
  message?: string;
}

export const liveN8nWorkflowProvider: WorkflowProvider = {
  isAvailable: () => n8nConfigured(),

  async trigger<TInput, TOutput>(workflowName: string, input: TInput): Promise<TOutput> {
    const payload = input as N8nTriggerPayload;
    const entry = getWorkflowCatalogEntry(workflowName);
    if (!entry) throw new Error(`Unknown workflow: ${workflowName}`);
    const base = n8nBaseUrl();
    if (!base) throw new Error("N8N_BASE_URL is not configured");

    const url = `${base}${entry.webhookPath}`;
    const res = await fetch(url, {
      method: "POST",
      headers: n8nOutboundHeaders(),
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: N8nTriggerResponse = {};
    if (text) {
      try {
        data = JSON.parse(text) as N8nTriggerResponse;
      } catch {
        data = { message: text.slice(0, 500) };
      }
    }

    if (!res.ok) {
      throw new Error(data.message ?? `n8n webhook failed (${res.status})`);
    }

    return {
      runId: data.externalRunId ?? data.runId ?? payload.runId,
      externalRunId: data.externalRunId ?? data.runId,
      status: data.status ?? "running",
      message: data.message,
    } as TOutput;
  },

  async getStatus(runId: string): Promise<WorkflowRunStatus> {
    return {
      runId,
      workflowName: "unknown",
      status: "running",
    };
  },
};

export const mockN8nWorkflowProvider: WorkflowProvider = {
  isAvailable: () => true,

  async trigger<TInput, TOutput>(workflowName: string, input: TInput): Promise<TOutput> {
    const payload = input as N8nTriggerPayload;
    return {
      runId: payload.runId,
      externalRunId: `mock-n8n-${Date.now()}`,
      status: "completed" as const,
      message: `Mock n8n completed ${workflowName}`,
    } as TOutput;
  },

  async getStatus(runId: string): Promise<WorkflowRunStatus> {
    return {
      runId,
      workflowName: "mock",
      status: "completed",
      completedAt: new Date().toISOString(),
    };
  },
};

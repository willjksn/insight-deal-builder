export type RevenueWorkflowRunStatus = "queued" | "running" | "completed" | "failed";

export type RevenueWorkflowTrigger = "scheduled" | "manual" | "webhook" | "retry";

export interface RevenueWorkflowRun {
  id: string;
  organizationCompany: string;
  ownerUserId?: string;
  workflowName: string;
  workflowLabel?: string;
  externalRunId?: string;
  status: RevenueWorkflowRunStatus;
  trigger: RevenueWorkflowTrigger;
  inputSummary?: string;
  errorSummary?: string;
  outputSummary?: string;
  retryCount?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueWorkflowCatalogEntry {
  name: string;
  label: string;
  description: string;
  schedule?: string;
  scheduleLabel?: string;
  webhookPath: string;
  phase: number;
}

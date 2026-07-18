import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_WORKFLOW_RUNS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { getWorkflowCatalogEntry } from "@/lib/revenueOpportunities/n8n/catalog";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getWorkflowProvider } from "@/lib/revenueOpportunities/providers/getWorkflowProvider";
import type { N8nTriggerPayload } from "@/lib/revenueOpportunities/providers/n8nProvider";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type {
  RevenueWorkflowRun,
  RevenueWorkflowRunStatus,
  RevenueWorkflowTrigger,
} from "@/lib/revenueOpportunities/types/workflowRun";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string {
  const company = appUser.company?.trim();
  if (!company) throw new RevenueOpportunityError("NOT_AUTHORIZED", "Organization company is required");
  return company;
}

export async function listWorkflowRuns(
  appUser: AppUser,
  filters?: { status?: RevenueWorkflowRunStatus; workflowName?: string; limit?: number }
): Promise<RevenueWorkflowRun[]> {
  const db = requireDb();
  let q: FirebaseFirestore.Query = db
    .collection(REVENUE_WORKFLOW_RUNS_COLLECTION)
    .where("organizationCompany", "==", tenantCompany(appUser));

  if (filters?.status) q = q.where("status", "==", filters.status);
  if (filters?.workflowName) q = q.where("workflowName", "==", filters.workflowName);

  const limit = filters?.limit ?? 50;
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let query = q;
      if (ordered) query = query.orderBy("createdAt", "desc");
      return query;
    },
    "createdAt",
    limit
  );
  return docs.map((d) => serializeDoc<RevenueWorkflowRun>(d.id, d.data()));
}

export async function getWorkflowRun(appUser: AppUser, id: string): Promise<RevenueWorkflowRun> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_WORKFLOW_RUNS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Workflow run not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Workflow run not found");
  }
  return serializeDoc<RevenueWorkflowRun>(snap.id, snap.data()!);
}

export async function createWorkflowRunRecord(input: {
  organizationCompany: string;
  ownerUserId?: string;
  workflowName: string;
  trigger: RevenueWorkflowTrigger;
  inputSummary?: string;
  status?: RevenueWorkflowRunStatus;
  externalRunId?: string;
  retryCount?: number;
}): Promise<RevenueWorkflowRun> {
  const db = requireDb();
  const entry = getWorkflowCatalogEntry(input.workflowName);
  const ref = await db.collection(REVENUE_WORKFLOW_RUNS_COLLECTION).add(
    stripUndefined({
      organizationCompany: input.organizationCompany,
      ownerUserId: input.ownerUserId,
      workflowName: input.workflowName,
      workflowLabel: entry?.label,
      externalRunId: input.externalRunId,
      status: input.status ?? "queued",
      trigger: input.trigger,
      inputSummary: input.inputSummary,
      retryCount: input.retryCount ?? 0,
      startedAt: input.status === "running" ? new Date().toISOString() : undefined,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueWorkflowRun>(ref.id, snap.data()!);
}

export async function updateWorkflowRunStatus(
  runId: string,
  organizationCompany: string,
  patch: Partial<
    Pick<
      RevenueWorkflowRun,
      "status" | "externalRunId" | "errorSummary" | "outputSummary" | "startedAt" | "completedAt" | "retryCount"
    >
  >
): Promise<RevenueWorkflowRun> {
  const db = requireDb();
  const ref = db.collection(REVENUE_WORKFLOW_RUNS_COLLECTION).doc(runId);
  const existing = await ref.get();
  if (!existing.exists) throw new RevenueOpportunityError("NOT_FOUND", "Workflow run not found");
  if (existing.data()!.organizationCompany !== organizationCompany) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Workflow run not found");
  }
  await ref.update(stripUndefined({ ...patch, updatedAt: FieldValue.serverTimestamp() }));
  const snap = await ref.get();
  return serializeDoc<RevenueWorkflowRun>(snap.id, snap.data()!);
}

export async function triggerRevenueWorkflow(
  appUser: AppUser | null,
  workflowName: string,
  options: {
    trigger: RevenueWorkflowTrigger;
    organizationCompany: string;
    ownerUserId?: string;
    input?: Record<string, unknown>;
    inputSummary?: string;
    retryOfRunId?: string;
  }
): Promise<RevenueWorkflowRun> {
  const entry = getWorkflowCatalogEntry(workflowName);
  if (!entry) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", `Unknown workflow: ${workflowName}`);
  }

  const { provider, mode } = getWorkflowProvider();
  if (mode === "not_configured") {
    throw new RevenueOpportunityError("WORKFLOW_UNAVAILABLE", "n8n is not configured");
  }

  let retryCount = 0;
  if (options.retryOfRunId && appUser) {
    const prior = await getWorkflowRun(appUser, options.retryOfRunId);
    retryCount = (prior.retryCount ?? 0) + 1;
  }

  const run = await createWorkflowRunRecord({
    organizationCompany: options.organizationCompany,
    ownerUserId: options.ownerUserId ?? appUser?.id,
    workflowName,
    trigger: options.trigger,
    inputSummary: options.inputSummary ?? entry.label,
    status: "running",
    retryCount,
  });

  const payload: N8nTriggerPayload = {
    workflowName,
    organizationCompany: options.organizationCompany,
    trigger: options.trigger === "retry" ? "retry" : options.trigger === "scheduled" ? "scheduled" : "manual",
    runId: run.id,
    ownerUserId: options.ownerUserId ?? appUser?.id,
    input: options.input,
  };

  try {
    const result = await provider.trigger(workflowName, payload);
    const status = result.status ?? "running";
    return updateWorkflowRunStatus(run.id, options.organizationCompany, {
      status: status === "completed" ? "completed" : "running",
      externalRunId: result.externalRunId ?? result.runId,
      outputSummary: result.message,
      ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Workflow trigger failed";
    return updateWorkflowRunStatus(run.id, options.organizationCompany, {
      status: "failed",
      errorSummary: message,
      completedAt: new Date().toISOString(),
    });
  }
}

export async function applyWorkflowWebhookUpdate(body: {
  runId: string;
  organizationCompany: string;
  status: RevenueWorkflowRunStatus;
  externalRunId?: string;
  errorSummary?: string;
  outputSummary?: string;
}): Promise<RevenueWorkflowRun> {
  const patch: Parameters<typeof updateWorkflowRunStatus>[2] = {
    status: body.status,
    externalRunId: body.externalRunId,
    errorSummary: body.errorSummary,
    outputSummary: body.outputSummary,
  };
  if (body.status === "running" && !patch.startedAt) {
    patch.startedAt = new Date().toISOString();
  }
  if (body.status === "completed" || body.status === "failed") {
    patch.completedAt = new Date().toISOString();
  }
  return updateWorkflowRunStatus(body.runId, body.organizationCompany, patch);
}

export async function retryFailedWorkflowRun(appUser: AppUser, runId: string): Promise<RevenueWorkflowRun> {
  const prior = await getWorkflowRun(appUser, runId);
  if (prior.status !== "failed") {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Only failed runs can be retried");
  }
  return triggerRevenueWorkflow(appUser, prior.workflowName, {
    trigger: "retry",
    organizationCompany: prior.organizationCompany,
    ownerUserId: appUser.id,
    inputSummary: `Retry: ${prior.workflowLabel ?? prior.workflowName}`,
    retryOfRunId: runId,
  });
}

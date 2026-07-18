"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueListAgentRuns,
  revenueListAgents,
  revenueListWorkflows,
  revenueRetryWorkflowRun,
  revenueTriggerWorkflow,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueAgentCatalogEntry, RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import type { RevenueWorkflowCatalogEntry, RevenueWorkflowRun } from "@/lib/revenueOpportunities/types/workflowRun";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { formatDateTime } from "@/lib/utils/format";

function agentStatusVariant(status: RevenueAgentRun["status"]): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "needs_review") return "warning";
  if (status === "running") return "info";
  return "default";
}

function workflowStatusVariant(status: RevenueWorkflowRun["status"]): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "info";
  if (status === "queued") return "warning";
  return "default";
}

export default function RevenueAutomationsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageRevenueOpportunities(appUser);
  const [agents, setAgents] = useState<RevenueAgentCatalogEntry[]>([]);
  const [runs, setRuns] = useState<RevenueAgentRun[]>([]);
  const [catalog, setCatalog] = useState<RevenueWorkflowCatalogEntry[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<RevenueWorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const token = () => user.getIdToken();
    const [a, r, w] = await Promise.all([
      revenueListAgents(token),
      revenueListAgentRuns(token, { limit: 25 }),
      revenueListWorkflows(token),
    ]);
    setAgents(a.agents);
    setRuns(r.runs);
    setCatalog(w.catalog);
    setWorkflowRuns(w.runs);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, reload]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Agents & automations"
        subtitle="In-app AI agents plus n8n scheduled workflows. Retry failed workflow runs from here."
      />
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">n8n workflows</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((w) => {
              const lastRun = workflowRuns.find((r) => r.workflowName === w.name);
              return (
                <div key={w.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{w.label}</p>
                    {lastRun && (
                      <Badge variant={workflowStatusVariant(lastRun.status)}>{lastRun.status}</Badge>
                    )}
                  </div>
                  <p className="mb-2 text-sm text-slate-600">{w.description}</p>
                  <p className="mb-3 text-xs text-slate-500">
                    {w.scheduleLabel ?? "On demand"} · <code className="text-[10px]">{w.webhookPath}</code>
                  </p>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === w.name}
                      onClick={async () => {
                        if (!user) return;
                        setBusy(w.name);
                        setError(null);
                        try {
                          await revenueTriggerWorkflow(() => user.getIdToken(), w.name);
                          await reload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Trigger failed");
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      Run now
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <h2 className="mb-3 text-lg font-semibold text-slate-900">Workflow runs</h2>
          {workflowRuns.length === 0 ? (
            <p className="mb-8 text-sm text-slate-600">
              No n8n workflow runs yet. Use Run now above or wait for the weekday cron schedule.
            </p>
          ) : (
            <div className="mb-8">
              <DataTable headers={["Workflow", "Status", "Trigger", "Summary", "When", ""]}>
                {workflowRuns.map((run) => (
                  <DataRow
                    key={run.id}
                    cells={[
                      run.workflowLabel ?? run.workflowName.replace(/_/g, " "),
                      <Badge key="status" variant={workflowStatusVariant(run.status)}>
                        {run.status}
                      </Badge>,
                      run.trigger,
                      run.errorSummary ?? run.outputSummary ?? run.inputSummary ?? "—",
                      formatDateTime(run.createdAt),
                      canManage && run.status === "failed" ? (
                        <Button
                          key="retry"
                          size="sm"
                          variant="outline"
                          disabled={busy === run.id}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!user) return;
                            setBusy(run.id);
                            setError(null);
                            try {
                              await revenueRetryWorkflowRun(() => user.getIdToken(), run.id);
                              await reload();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Retry failed");
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Retry
                        </Button>
                      ) : (
                        ""
                      ),
                    ]}
                  />
                ))}
              </DataTable>
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold text-slate-900">Agent registry</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <div key={a.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{a.label}</p>
                  <Badge variant={a.status === "live" ? "success" : a.status === "stub" ? "warning" : "default"}>
                    {a.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{a.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {a.name} · v{a.version} · Phase {a.phase}
                </p>
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent agent runs</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-slate-600">
              No agent runs yet. Run quality review from an opportunity detail page.
            </p>
          ) : (
            <DataTable headers={["Agent", "Status", "Subject / context", "Duration", "When"]}>
              {runs.map((run) => (
                <DataRow
                  key={run.id}
                  href={run.opportunityId ? `/revenue/opportunities/${run.opportunityId}` : undefined}
                  cells={[
                    run.agentName.replace(/_/g, " "),
                    <Badge key="status" variant={agentStatusVariant(run.status)}>
                      {run.status}
                    </Badge>,
                    run.inputSummary ?? run.opportunityId ?? "—",
                    run.durationMs != null ? `${run.durationMs} ms` : "—",
                    formatDateTime(run.createdAt),
                  ]}
                />
              ))}
            </DataTable>
          )}
        </>
      )}
    </>
  );
}

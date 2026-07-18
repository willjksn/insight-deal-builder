"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueDeleteWorkflowRun,
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
import { Select } from "@/components/ui/Select";
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

/** Workflow runs feature started July 2026 — no earlier months in the picker. */
const WORKFLOW_RUNS_START_MONTH = "2026-07";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

/** Months from July 2026 through the current month (newest first). */
function monthsFromStart(): { value: string; label: string }[] {
  const start = new Date(2026, 6, 1); // July 2026
  const end = new Date();
  end.setDate(1);
  const opts: { value: string; label: string }[] = [];
  for (let d = new Date(end.getFullYear(), end.getMonth(), 1); d >= start; d.setMonth(d.getMonth() - 1)) {
    const key = monthKey(d);
    opts.push({ value: key, label: monthLabel(key) });
  }
  if (opts.length === 0) {
    opts.push({ value: WORKFLOW_RUNS_START_MONTH, label: monthLabel(WORKFLOW_RUNS_START_MONTH) });
  }
  return opts;
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
  /** `YYYY-MM` calendar month (defaults to current month). */
  const [runRange, setRunRange] = useState(() => monthKey(new Date()));
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());

  const monthOptions = useMemo(() => monthsFromStart(), []);
  const allVisibleSelected =
    workflowRuns.length > 0 && workflowRuns.every((r) => selectedRunIds.has(r.id));
  const someSelected = selectedRunIds.size > 0;

  const reload = useCallback(async () => {
    if (!user) return;
    const token = () => user.getIdToken();
    const [a, r, w] = await Promise.all([
      revenueListAgents(token),
      revenueListAgentRuns(token, { limit: 25 }),
      revenueListWorkflows(token, { month: runRange, limit: 100 }),
    ]);
    setAgents(a.agents);
    setRuns(r.runs);
    setCatalog(w.catalog);
    setWorkflowRuns(w.runs);
    setSelectedRunIds((prev) => {
      const visible = new Set(w.runs.map((run) => run.id));
      return new Set([...prev].filter((id) => visible.has(id)));
    });
  }, [user, runRange]);

  const toggleRunSelected = (id: string) => {
    setSelectedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedRunIds(new Set());
      return;
    }
    setSelectedRunIds(new Set(workflowRuns.map((r) => r.id)));
  };

  const deleteRuns = async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    const label =
      ids.length === 1 ? "Delete this workflow run?" : `Delete ${ids.length} workflow runs?`;
    if (!window.confirm(label)) return;
    setBusy("bulk-delete");
    setError(null);
    try {
      const token = () => user.getIdToken();
      await Promise.all(ids.map((id) => revenueDeleteWorkflowRun(token, id)));
      setSelectedRunIds(new Set());
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, reload]);

  const hasActiveWorkflowRuns = workflowRuns.some(
    (r) => r.status === "running" || r.status === "queued"
  );

  useEffect(() => {
    if (!user || !hasActiveWorkflowRuns) return;
    const id = window.setInterval(() => {
      reload().catch(() => {});
    }, 2500);
    return () => window.clearInterval(id);
  }, [user, hasActiveWorkflowRuns, reload]);

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
                  <p className="mb-3 text-xs text-slate-500">{w.scheduleLabel ?? "On demand"}</p>
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

          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Workflow runs</h2>
              {canManage && someSelected && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === "bulk-delete"}
                  onClick={() => deleteRuns([...selectedRunIds])}
                >
                  <Trash2 className="mr-1.5 h-4 w-4 text-red-500" />
                  Delete selected ({selectedRunIds.size})
                </Button>
              )}
            </div>
            <div className="w-40 shrink-0">
              <Select
                label="Month"
                wrapperClassName="w-40"
                className="w-40"
                options={monthOptions}
                value={runRange}
                onChange={(e) => setRunRange(e.target.value)}
              />
            </div>
          </div>
          {workflowRuns.length === 0 ? (
            <p className="mb-8 text-sm text-slate-600">
              No workflow runs in {monthLabel(runRange)}.
            </p>
          ) : (
            <div className="mb-8">
              <DataTable
                headers={
                  canManage
                    ? [
                        <input
                          key="select-all"
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                          checked={allVisibleSelected}
                          aria-label="Select all workflow runs"
                          onChange={toggleSelectAllVisible}
                        />,
                        "Workflow",
                        "Status",
                        "Trigger",
                        "Summary",
                        "When",
                        "",
                      ]
                    : ["Workflow", "Status", "Trigger", "Summary", "When", ""]
                }
              >
                {workflowRuns.map((run) => {
                  const actionCells = canManage
                    ? [
                        <input
                          key="check"
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                          checked={selectedRunIds.has(run.id)}
                          aria-label={`Select ${run.workflowLabel ?? run.workflowName}`}
                          onChange={() => toggleRunSelected(run.id)}
                          onClick={(e) => e.stopPropagation()}
                        />,
                        run.workflowLabel ?? run.workflowName.replace(/_/g, " "),
                        <Badge key="status" variant={workflowStatusVariant(run.status)}>
                          {run.status}
                        </Badge>,
                        run.trigger,
                        run.errorSummary ?? run.outputSummary ?? run.inputSummary ?? "—",
                        formatDateTime(run.createdAt),
                        <div key="actions" className="flex flex-wrap items-center gap-2">
                          {run.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === run.id || busy === "bulk-delete"}
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
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Delete workflow run"
                            disabled={busy === run.id || busy === "bulk-delete"}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void deleteRuns([run.id]);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>,
                      ]
                    : [
                        run.workflowLabel ?? run.workflowName.replace(/_/g, " "),
                        <Badge key="status" variant={workflowStatusVariant(run.status)}>
                          {run.status}
                        </Badge>,
                        run.trigger,
                        run.errorSummary ?? run.outputSummary ?? run.inputSummary ?? "—",
                        formatDateTime(run.createdAt),
                        "",
                      ];

                  return (
                    <DataRow
                      key={run.id}
                      cells={actionCells}
                      actionCellIndex={canManage ? 0 : undefined}
                    />
                  );
                })}
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
